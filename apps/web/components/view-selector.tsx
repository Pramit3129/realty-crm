"use client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

export default function ViewSelector() {
  return (
    <DropdownMenu>

      <DropdownMenuTrigger className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded">

        All People
        <span className="text-gray-500">6</span>

        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />

      </DropdownMenuTrigger>

      <DropdownMenuContent>

        <DropdownMenuItem>All People</DropdownMenuItem>
        <DropdownMenuItem>Leads</DropdownMenuItem>
        <DropdownMenuItem>Customers</DropdownMenuItem>

      </DropdownMenuContent>

    </DropdownMenu>
  )
}