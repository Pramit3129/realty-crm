"use client"

import { HugeiconsIcon } from "@hugeicons/react"

import {
  Setting07Icon,
  Search01Icon,
  UserGroupIcon,
  Building02Icon,
  Target01Icon,
  Task01Icon,
  Note01Icon,
  WorkflowCircle01Icon,
  DashboardSquare01Icon
} from "@hugeicons/core-free-icons"

export default function Sidebar() {
  return (
    <div className="w-50 flex flex-col">

      <div className="px-4 py-4 flex items-center gap-2 text-sm font-medium">
        <div className="bg-green-500 text-white w-6 h-6 flex items-center justify-center rounded">
          N
        </div>
        new
      </div>

      <nav className="flex flex-col text-sm">

        <SidebarItem icon={Search01Icon} label="Search"/>
        <SidebarItem icon={Setting07Icon} label="Settings"/>

      </nav>

      <div className="px-3 py-3 text-sm text-gray-900">
        Workspace
      </div>

      <nav className="flex flex-col text-sm">

        <SidebarItem icon={UserGroupIcon} label="Leads" active/>
        <SidebarItem icon={Building02Icon} label="Companies"/>
        <SidebarItem icon={Target01Icon} label="Opportunities"/>
        <SidebarItem icon={Task01Icon} label="Tasks"/>
        <SidebarItem icon={Note01Icon} label="Notes"/>
        <SidebarItem icon={WorkflowCircle01Icon} label="Workflows"/>
        <SidebarItem icon={DashboardSquare01Icon} label="Dashboards"/>

      </nav>

    </div>
  )
}

function SidebarItem({
  icon,
  label,
  active
}:{
  icon:any
  label:string
  active?:boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
        active
          ? "bg-gray-200 font-medium rounded-md mx-2 my-0.5"
          : "text-gray-600 hover:bg-gray-200 rounded-md mx-2 my-0.5"
      }`}
    >

      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.5}
      />

      {label}

    </div>
  )
}