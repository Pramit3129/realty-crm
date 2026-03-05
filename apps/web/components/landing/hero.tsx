import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="py-28 text-center">

      <h1 className="text-6xl font-bold tracking-tight">
        Open Source CRM
      </h1>

      <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
        Build relationships with your customers using a modern
        open-source CRM platform.
      </p>

      <div className="flex justify-center gap-4 mt-8">
        <Button size="lg">Start for free</Button>
        <Button size="lg" variant="outline">View GitHub</Button>
      </div>

    </section>
  )
}