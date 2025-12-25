import { getUncachableStripeClient } from './stripeClient';

async function seedMembershipProducts() {
  console.log('Creating membership products in Stripe...');
  
  const stripe = await getUncachableStripeClient();

  // Check if products already exist
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'vine-inventory'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed.');
    console.log('Existing products:', existingProducts.data.map(p => p.name).join(', '));
    return;
  }

  // Create Pro Plan
  console.log('Creating Pro Plan...');
  const proProduct = await stripe.products.create({
    name: 'Pro Plan',
    description: 'Advanced analytics, unlimited storage, priority support',
    metadata: {
      app: 'vine-inventory',
      tier: 'pro',
      features: 'analytics,unlimited_storage,priority_support,ai_assistant'
    }
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 999, // $9.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'pro' }
  });

  console.log(`Created Pro Plan: ${proProduct.id} with price ${proPrice.id}`);

  // Create Business Plan
  console.log('Creating Business Plan...');
  const businessProduct = await stripe.products.create({
    name: 'Business Plan',
    description: 'All features, marketplace access, API integrations, dedicated support',
    metadata: {
      app: 'vine-inventory',
      tier: 'business',
      features: 'analytics,unlimited_storage,priority_support,ai_assistant,marketplace,api_access,dedicated_support'
    }
  });

  const businessPrice = await stripe.prices.create({
    product: businessProduct.id,
    unit_amount: 2999, // $29.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'business' }
  });

  console.log(`Created Business Plan: ${businessProduct.id} with price ${businessPrice.id}`);

  console.log('\nMembership products created successfully!');
  console.log('\nProduct IDs:');
  console.log(`Pro: ${proProduct.id} (Price: ${proPrice.id})`);
  console.log(`Business: ${businessProduct.id} (Price: ${businessPrice.id})`);
}

seedMembershipProducts().catch(console.error);
