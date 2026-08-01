import { Decimal } from "@prisma/client/runtime/library"
import { PricingStrategy } from "./constants"

export interface PricingInput {
  pricingStrategy: PricingStrategy
  calculatedPrice: Decimal | number | string
  lockedPrice: Decimal | number | string | null
  isPriceFrozen: boolean
  isReadyForDelivery: boolean
  readyDate: Date | null
  priceAtReadyTime: Decimal | number | string | null
  packageCurrentPrice: Decimal | number | string
  totalConfirmedPaid: Decimal | number | string
  /**
   * Optional per-project price adjustment (Rials). When the engine would
   * normally return the raw `packageCurrentPrice` (i.e. for variable/delayed
   * projects that haven't been committed yet), it instead returns
   * `packageCurrentPrice + priceAdjustment - discountAmount`. This keeps
   * the live "track the package price" behavior while still applying the
   * per-project adjustment and discount.
   */
  priceAdjustment?: Decimal | number | string | null
  /**
   * Optional per-project discount (Rials). Applied on top of the adjusted
   * base when the engine returns the live "current" price (see above).
   */
  discountAmount?: Decimal | number | string | null
}

function toNum(v: Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === "number") return v
  return Number(v.toString())
}

/**
 * Pricing Engine — returns the effective current price for a project.
 * Rules:
 *  - locked_price wins always
 *  - fixed: calculatedPrice (locked at creation time, never follows the package price)
 *  - variable: frozen OR paid >= 70% => calculated_price; else (package.current_price + adjustment - discount)
 *  - delayed: not ready => (package.current_price + adjustment - discount); ready within 30 days => price_at_ready_time; else (package.current_price + adjustment - discount)
 *
 *  When the engine would normally return the raw package current price
 *  (the "track the live package price" case), it now applies the per-project
 *  `priceAdjustment` and `discountAmount` so that:
 *    effectivePrice = (package.currentPrice + priceAdjustment) - discountAmount
 *  which mirrors how `calculatedPrice` is derived at creation time.
 */
export function getEffectivePrice(p: PricingInput): number {
  if (toNum(p.lockedPrice) > 0) return toNum(p.lockedPrice)

  const calc = toNum(p.calculatedPrice)
  const current = toNum(p.packageCurrentPrice)
  const adjustment = toNum(p.priceAdjustment ?? 0)
  const discount = toNum(p.discountAmount ?? 0)
  // Live "current" price = adjusted base minus discount. Floor at 0.
  const livePrice = Math.max(0, current + adjustment - discount)

  switch (p.pricingStrategy) {
    case "fixed":
      // Truly fixed — always returns the price captured at creation time.
      return calc
    case "variable": {
      if (p.isPriceFrozen) return calc
      const paid = toNum(p.totalConfirmedPaid)
      if (paid >= calc * 0.7) return calc
      return livePrice
    }
    case "delayed": {
      if (!p.isReadyForDelivery || !p.readyDate) return livePrice
      const daysSinceReady = Math.floor(
        (Date.now() - new Date(p.readyDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceReady <= 30) return toNum(p.priceAtReadyTime)
      return livePrice
    }
    default:
      return calc
  }
}

