// Gmail Integration for Vine Tracker
// Connection: google-mail

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface VineEmailData {
  asin: string;
  description: string;
  orderDate: Date;
  emailId: string;
}

// Search for Amazon Vine order confirmation emails
export async function searchVineEmails(maxResults: number = 50): Promise<VineEmailData[]> {
  const gmail = await getGmailClient();
  
  // Search for Amazon Vine emails
  const searchQuery = 'from:shipment-tracking@amazon.com OR from:auto-confirm@amazon.com subject:vine';
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: searchQuery,
    maxResults,
  });

  const messages = response.data.messages || [];
  const vineOrders: VineEmailData[] = [];

  for (const message of messages) {
    try {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const payload = msgData.data.payload;
      const headers = payload?.headers || [];
      
      const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
      
      // Get email body
      let body = '';
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }

      // Extract ASIN from email body - ASINs are 10 character alphanumeric codes
      const asinMatches = body.match(/\b[A-Z0-9]{10}\b/g) || [];
      const uniqueAsins = [...new Set(asinMatches)];

      for (const asin of uniqueAsins) {
        // Basic validation - ASINs typically start with B0
        if (asin.startsWith('B0') || /^[A-Z][0-9A-Z]{9}$/.test(asin)) {
          vineOrders.push({
            asin,
            description: subject.replace(/^(Fwd:|Re:)\s*/gi, '').trim(),
            orderDate: dateHeader ? new Date(dateHeader) : new Date(),
            emailId: message.id!,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing email ${message.id}:`, error);
    }
  }

  return vineOrders;
}

// Check if Gmail is connected
// NOTE: Currently disabled - per-user OAuth is required for multi-tenant safety
// The Replit connector uses a shared token which would expose one user's emails to all users
export async function isGmailConnected(): Promise<boolean> {
  // Disabled until per-user OAuth is implemented
  return false;
}
