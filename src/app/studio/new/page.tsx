import { Wizard } from "@/components/studio/wizard";
import { aiChainReady } from "@/lib/ai/context";

export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  return <Wizard aiReady={await aiChainReady()} />;
}
