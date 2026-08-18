import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize';

export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80).transform(sanitizeText),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d[\d\s-]{7,17}$/, 'Enter a valid phone number')
    .transform((value) => value.replace(/[\s-]/g, '')),
  region: z.string().trim().min(2).max(60).transform(sanitizeText),
  city: z.string().trim().min(2).max(60).transform(sanitizeText),
  street: z.string().trim().min(2).max(120).transform(sanitizeText),
  apartment: z.string().trim().max(40).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  postalCode: z.string().trim().max(12).optional(),
});

export const createOrderSchema = z.object({
  /** Use a saved address, or supply one inline — exactly one of the two. */
  addressId: z.string().cuid().optional(),
  address: addressSchema.optional(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CARD']).default('CASH_ON_DELIVERY'),
  note: z.string().trim().max(500).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  /**
   * Optional subset of the cart. Omitted means "everything in the cart",
   * which is what the standard checkout button sends.
   */
  variantIds: z.array(z.string().cuid()).max(100).optional(),
})
  .refine((data) => Boolean(data.addressId) !== Boolean(data.address), {
    message: 'Provide either a saved addressId or a new address, not both',
    path: ['address'],
  });

export const listOrdersQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const adminListOrdersQuerySchema = listOrdersQuerySchema.extend({
  q: z.string().trim().max(60).optional(),
  userId: z.string().cuid().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']),
});

export const createAddressSchema = addressSchema.extend({
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
