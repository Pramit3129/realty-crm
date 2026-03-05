import { Card, CardContent } from "@/components/ui/card"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Rocket01Icon,
  WorkflowCircle01Icon,
  UserGroupIcon
} from "@hugeicons/core-free-icons"

const features = [
  {
    title: "Powerful workflows",
    desc: "Automate processes and manage your sales pipeline.",
    icon: WorkflowCircle01Icon
  },
  {
    title: "Team collaboration",
    desc: "Work together seamlessly across your organization.",
    icon: UserGroupIcon
  },
  {
    title: "Fast & scalable",
    desc: "Built for performance using modern architecture.",
    icon: Rocket01Icon
  }
]

export default function Features() {
  return (
    <section className="max-w-6xl mx-auto py-24 grid md:grid-cols-3 gap-8">

      {features.map((feature, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-4">

            <HugeiconsIcon
              icon={feature.icon}
              size={28}
            />

            <h3 className="text-lg font-semibold">
              {feature.title}
            </h3>

            <p className="text-sm text-muted-foreground">
              {feature.desc}
            </p>

          </CardContent>
        </Card>
      ))}

    </section>
  )
}