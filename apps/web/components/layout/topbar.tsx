import { Button } from "@/components/ui/button"
import { Menu01Icon, User02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export default function Topbar() {
  return (
    <div className="flex items-center justify-between px-6 py-3">

      <div className="flex items-center justify-center gap-2 text-sm font-medium">
      <div className="" ><HugeiconsIcon icon={User02Icon} size={18} /></div>
        People
      </div>

      <div className="flex items-center gap-3">

        {/* <Button size="sm" variant="outline">
          Filter
        </Button>

        <Button size="sm" variant="outline">
          Sort
        </Button> */}

        <Button size="sm">
          + New record
        </Button>
        <Button size="sm" variant="outline">
            <HugeiconsIcon icon={Menu01Icon} size={8} />
        </Button>

      </div>

    </div>
  )
}