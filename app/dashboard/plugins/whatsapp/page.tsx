import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WhatsappPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Whatsapp gateway</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Whatsapp gateway is a tool that allows you to send and receive
            messages on Whatsapp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
