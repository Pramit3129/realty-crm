"use client"

import { useState } from "react"

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

export default function CommandPanel() {

  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border px-3 py-1 rounded text-sm"
      >
        Ctrl K
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>

        <CommandInput placeholder="Type anything..." />

        <CommandList>

          <CommandGroup heading="People">
            <CommandItem>Create new record</CommandItem>
            <CommandItem>Import records</CommandItem>
            <CommandItem>Export view</CommandItem>
            <CommandItem>See deleted records</CommandItem>
          </CommandGroup>

          <CommandGroup heading="Navigation">
            <CommandItem>Go to Workflows</CommandItem>
            <CommandItem>Go to Companies</CommandItem>
            <CommandItem>Go to Dashboards</CommandItem>
          </CommandGroup>

        </CommandList>

      </CommandDialog>
    </>
  )
}