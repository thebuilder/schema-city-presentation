import { CorporateSlide } from "@/deck/parts/takeover/corporate-slide"
import { MatrixTakeover } from "@/deck/parts/takeover/matrix-takeover"

export function Takeover() {
  return (
    <MatrixTakeover
      corporate={<CorporateSlide />}
      credits="Daniel Schmidt // Umbraco DK // 22.10.2026"
      title="SCHEMA CITY"
    />
  )
}
