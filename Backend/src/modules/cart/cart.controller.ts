import { asyncHandler, noContent, ok } from '../../core/http';
import * as cartService from './cart.service';
import type { AddToCartInput, MergeCartInput, UpdateCartItemInput } from './cart.schema';

export const get = asyncHandler(async (req, res) => {
  ok(res, await cartService.getCart(req.user!.id));
});

export const count = asyncHandler(async (req, res) => {
  ok(res, { count: await cartService.getCartCount(req.user!.id) });
});

export const add = asyncHandler(async (req, res) => {
  const body = req.body as AddToCartInput;
  ok(res, await cartService.addToCart(req.user!.id, body.variantId, body.quantity));
});

export const update = asyncHandler(async (req, res) => {
  const body = req.body as UpdateCartItemInput;
  ok(res, await cartService.updateQuantity(req.user!.id, req.params.variantId as string, body.quantity));
});

export const remove = asyncHandler(async (req, res) => {
  ok(res, await cartService.removeItem(req.user!.id, req.params.variantId as string));
});

export const clear = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user!.id);
  noContent(res);
});

export const merge = asyncHandler(async (req, res) => {
  ok(res, await cartService.mergeCart(req.user!.id, req.body as MergeCartInput));
});
