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
 *  - fixed: calculated_price
 *  - variable: frozen OR paid >= 70% => calculated_price; else package.current_price
 *  - delayed: not ready => package.current_price; ready within 30 days => price_at_ready_time; else package.current_price
 */
export function getEffectivePrice(p: PricingInput): number {
  if (toNum(p.lockedPrice) > 0) return toNum(p.lockedPrice)

  const calc = toNum(p.calculatedPrice)
  const current = toNum(p.packageCurrentPrice)

  switch (p.pricingStrategy) {
    case "fixed":
      return calc
    case "variable": {
      if (p.isPriceFrozen) return calc
      const paid = toNum(p.totalConfirmedPaid)
      if (paid >= calc * 0.7) return calc
      return current
    }
    case "delayed": {
      if (!p.isReadyForDelivery || !p.readyDate) return current
      const daysSinceReady = Math.floor(
        (Date.now() - new Date(p.readyDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceReady <= 30) return toNum(p.priceAtReadyTime)
      return current
    }
    default:
      return calc
  }
}
