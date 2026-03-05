"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  User02Icon,
  Mail01Icon,
  Building01Icon,
  Call02Icon,
  Location01Icon
} from "@hugeicons/core-free-icons"

const data = [
  {
    name: "Brian Chesky",
    email: "chesky@airbnb.com",
    company: "Airbnb",
    phone: "+1123456789",
    city: "San Francisco",
  },
  {
    name: "Dario Amodei",
    email: "amodei@anthropic.cc",
    company: "Anthropic",
    phone: "+1555123456",
    city: "San Francisco",
  },
  {
    name: "Patrick Collison",
    email: "collison@stripe.com",
    company: "Stripe",
    phone: "+1987625341",
    city: "San Francisco",
  },
]

export default function PeopleTable() {

  const [cols, setCols] = useState([40,220,240,180,180,160])

  const startResize = (index:number, e:React.MouseEvent) => {

    const startX = e.clientX
    const startWidth = cols[index]

    const onMove = (e:MouseEvent) => {

      const newCols = [...cols]

      newCols[index] = Math.max(
        60,
        startWidth + (e.clientX - startX)
      )

      setCols(newCols)
    }

    const onUp = () => {

      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)

    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)

  }

  const grid = `
    ${cols[0]}px
    ${cols[1]}px
    ${cols[2]}px
    ${cols[3]}px
    ${cols[4]}px
    ${cols[5]}px
  `

  return (

    <div className="flex-1 rounded-lg bg-white m-3">

      <div className="rounded-t-lg overflow-hidden">

        {/* HEADER */}

        <div
          style={{ gridTemplateColumns: grid }}
          className="grid text-sm text-gray-500 border-b bg-gray-50"
        >

          <HeaderCell resize={(e:any)=>startResize(0,e)}>
            <Checkbox/>
          </HeaderCell>

          <HeaderCell resize={(e:any)=>startResize(1,e)}>
            <HugeiconsIcon icon={User02Icon} size={14}/>
            Name
          </HeaderCell>

          <HeaderCell resize={(e:any)=>startResize(2,e)}>
            <HugeiconsIcon icon={Mail01Icon} size={14}/>
            Emails
          </HeaderCell>

          <HeaderCell resize={(e:any)=>startResize(3,e)}>
            <HugeiconsIcon icon={Building01Icon} size={14}/>
            Company
          </HeaderCell>

          <HeaderCell resize={(e:any)=>startResize(4,e)}>
            <HugeiconsIcon icon={Call02Icon} size={14}/>
            Phones
          </HeaderCell>

          <HeaderCell resize={(e:any)=>startResize(5,e)}>
            <HugeiconsIcon icon={Location01Icon} size={14}/>
            City
          </HeaderCell>

        </div>

        {/* ROWS */}

        {data.map((item,i)=>(
          <div
            key={i}
            style={{ gridTemplateColumns: grid }}
            className="grid text-sm border-b hover:bg-gray-50"
          >

            <Cell>
              <Checkbox/>
            </Cell>

            <Cell>
              {item.name}
            </Cell>

            <Cell>
              <Tag>{item.email}</Tag>
            </Cell>

            <Cell>
              <Tag>{item.company}</Tag>
            </Cell>

            <Cell>
              <Tag>{item.phone}</Tag>
            </Cell>

            <Cell>
              {item.city}
            </Cell>

          </div>
        ))}

        {/* ADD ROW */}

        <div className="text-sm text-gray-500 px-4 py-2 border-b hover:bg-gray-50 cursor-pointer">
          + Add New
        </div>

      </div>

    </div>
  )
}

function HeaderCell({
  children,
  resize
}:{
  children:React.ReactNode
  resize:any
}){

  return(

    <div className="relative flex items-center gap-2 px-4 py-2 border-r last:border-r-0">

      {children}

      <div
        onMouseDown={resize}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-400"
      />

    </div>

  )
}

function Cell({
  children
}:{ children:React.ReactNode }){

  return(

    <div className="px-4 py-2 flex items-center border-r last:border-r-0">

      {children}

    </div>

  )

}

function Tag({
  children
}:{ children:React.ReactNode }){

  return(

    <span className="px-2 py-0.5 text-xs border rounded-md bg-gray-100">

      {children}

    </span>

  )

}