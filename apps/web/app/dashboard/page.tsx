import Sidebar from "@/components/layout/sidebar"
import Topbar from "@/components/layout/topbar"
import PeopleTable from "@/components/people-table"

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f1f1f1]">

      <Sidebar />

      <div className="flex flex-col flex-1">
        <Topbar />
        <PeopleTable />
      </div>

    </div>
  )
}