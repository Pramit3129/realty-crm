import { Button } from "@/components/ui/button"

export default function CTA() {
  return (
    <section className="bg-muted py-24 text-center">

      <h2 className="text-4xl font-bold">
        Take control of your CRM
      </h2>

      <p className="text-muted-foreground mt-4">
        Start building your customer relationships today.
      </p>

      <Button className="mt-6">
        Get Started
      </Button>

    </section>
  )
}