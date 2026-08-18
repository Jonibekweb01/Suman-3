import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAddresses, useCreateOrder } from '../../entities/order/api';
import { ApiError } from '../../shared/api/types';
import { cn } from '../../shared/lib/cn';
import { formatPrice } from '../../shared/lib/format';
import { Button, Input, Modal, useToast } from '../../shared/ui';
import type { Cart, PaymentMethod } from '../../shared/types/commerce';

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d[\d\s-]{7,17}$/, 'Enter a valid phone number'),
  region: z.string().trim().min(2, 'Required').max(60),
  city: z.string().trim().min(2, 'Required').max(60),
  street: z.string().trim().min(2, 'Required').max(120),
  apartment: z.string().trim().max(40).optional(),
  postalCode: z.string().trim().max(12).optional(),
  note: z.string().trim().max(500).optional(),
});

type AddressValues = z.infer<typeof addressSchema>;

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; hint: string }> = [
  { value: 'CASH_ON_DELIVERY', label: 'Cash on delivery', hint: 'Pay the courier when it arrives' },
  { value: 'CARD', label: 'Card', hint: 'Uzcard, Humo, Visa' },
];

/**
 * Checkout.
 *
 * Saved addresses are offered first — a returning customer should not retype
 * their street every order. The form is only shown when there is nothing saved
 * or the shopper explicitly wants a different destination.
 */
export function CheckoutModal({
  open,
  onClose,
  cart,
}: {
  open: boolean;
  onClose: () => void;
  cart: Cart;
}) {
  const navigate = useNavigate();
  const pushToast = useToast((state) => state.push);
  const { data: addresses } = useAddresses();
  const createOrder = useCreateOrder();

  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const savedAddresses = addresses ?? [];
  const useSaved = selectedAddressId !== 'new' && savedAddresses.length > 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { fullName: '', phone: '', region: '', city: '', street: '' },
  });

  async function placeOrder(values?: AddressValues): Promise<void> {
    setSubmitError(null);

    try {
      const order = await createOrder.mutateAsync({
        paymentMethod,
        ...(useSaved
          ? { addressId: selectedAddressId }
          : {
              address: {
                fullName: values!.fullName,
                phone: values!.phone,
                region: values!.region,
                city: values!.city,
                street: values!.street,
                ...(values!.apartment ? { apartment: values!.apartment } : {}),
                ...(values!.postalCode ? { postalCode: values!.postalCode } : {}),
              },
            }),
        ...(values?.note ? { note: values.note } : {}),
      });

      onClose();
      pushToast(`Order ${order.orderNumber} placed`);
      navigate('/orders');
    } catch (error) {
      // Stock can sell out between opening the cart and confirming — the
      // server rejects with a 409 and the shopper needs to see exactly why.
      setSubmitError(error instanceof ApiError ? error.message : 'Could not place the order');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Checkout" variant="sheet" size="lg">
      <form
        onSubmit={handleSubmit((values) => placeOrder(values))}
        className="space-y-6"
        noValidate
      >
        {savedAddresses.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-medium">Delivery address</h3>
            <div className="space-y-2">
              {savedAddresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors',
                    selectedAddressId === address.id
                      ? 'border-ink bg-surface-sunken'
                      : 'border-line-strong hover:border-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                    className="mt-1 size-4 accent-[var(--color-ink)]"
                  />
                  <span className="text-sm">
                    <span className="block font-medium">{address.fullName}</span>
                    <span className="block text-muted">
                      {address.region}, {address.city}, {address.street}
                      {address.apartment ? `, ${address.apartment}` : ''}
                    </span>
                    <span className="block text-muted">{address.phone}</span>
                  </span>
                </label>
              ))}

              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-card border p-3.5 text-sm transition-colors',
                  selectedAddressId === 'new'
                    ? 'border-ink bg-surface-sunken'
                    : 'border-line-strong hover:border-ink',
                )}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === 'new'}
                  onChange={() => setSelectedAddressId('new')}
                  className="size-4 accent-[var(--color-ink)]"
                />
                Deliver somewhere else
              </label>
            </div>
          </section>
        )}

        {!useSaved && (
          <section className="space-y-4">
            {savedAddresses.length === 0 && (
              <h3 className="text-sm font-medium">Delivery address</h3>
            )}

            <Input {...register('fullName')} label="Full name" error={errors.fullName?.message} />
            <Input
              {...register('phone')}
              label="Phone"
              type="tel"
              placeholder="+998 90 123 45 67"
              error={errors.phone?.message}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input {...register('region')} label="Region" error={errors.region?.message} />
              <Input {...register('city')} label="City / district" error={errors.city?.message} />
            </div>

            <Input {...register('street')} label="Street and house" error={errors.street?.message} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input {...register('apartment')} label="Apartment (optional)" />
              <Input {...register('postalCode')} label="Postal code (optional)" />
            </div>

            <Input {...register('note')} label="Delivery note (optional)" />
          </section>
        )}

        <section>
          <h3 className="mb-3 text-sm font-medium">Payment</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'cursor-pointer rounded-card border p-3.5 text-sm transition-colors',
                  paymentMethod === option.value
                    ? 'border-ink bg-surface-sunken'
                    : 'border-line-strong hover:border-ink',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === option.value}
                    onChange={() => setPaymentMethod(option.value)}
                    className="size-4 accent-[var(--color-ink)]"
                  />
                  <span className="font-medium">{option.label}</span>
                </span>
                <span className="mt-1 block pl-6.5 text-xs text-muted">{option.hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-card bg-surface-sunken p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">
              {cart.summary.itemCount} {cart.summary.itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="tabular-nums">
              {formatPrice(cart.summary.subtotal, cart.summary.currency)}
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted">Delivery</span>
            <span className="tabular-nums">
              {cart.summary.deliveryFee === 0
                ? 'Free'
                : formatPrice(cart.summary.deliveryFee, cart.summary.currency)}
            </span>
          </div>
          <div className="mt-3 flex justify-between border-t border-line-strong pt-3 text-base font-medium">
            <span>Total</span>
            <span className="tabular-nums">
              {formatPrice(cart.summary.total, cart.summary.currency)}
            </span>
          </div>
        </section>

        {submitError && (
          <p role="alert" className="rounded-card bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {submitError}
          </p>
        )}

        <Button
          type={useSaved ? 'button' : 'submit'}
          onClick={useSaved ? () => void placeOrder() : undefined}
          size="lg"
          fullWidth
          isLoading={createOrder.isPending}
        >
          Place order · {formatPrice(cart.summary.total, cart.summary.currency)}
        </Button>
      </form>
    </Modal>
  );
}
