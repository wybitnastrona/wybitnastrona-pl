import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  _stripe = new Stripe(key, {
    typescript: true,
  });
  return _stripe;
}

/**
 * Pobiera lub tworzy Stripe Customer dla zalogowanego uzytkownika.
 * ID jest cache'owane w profiles.stripe_customer_id.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null,
): Promise<Stripe.Customer> {
  const stripe = getStripe();
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return customer as Stripe.Customer;
    } catch {
      // fallthrough do tworzenia nowego
    }
  }
  return await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });
}
