"use client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons"

export default function WorkspaceMenu() {
  return (
    <DropdownMenu>

      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md">

        <div className="w-6 h-6 bg-green-500 text-white flex items-center justify-center rounded">
          N
        </div>

        new

        <HugeiconsIcon icon={MoreHorizontalCircle01Icon} size={18} />

      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">

        <DropdownMenuItem>Theme · Light</DropdownMenuItem>
        <DropdownMenuItem>Invite user</DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuItem>Documentation</DropdownMenuItem>
        <DropdownMenuItem>Log out</DropdownMenuItem>

      </DropdownMenuContent>

    </DropdownMenu>
  )
}