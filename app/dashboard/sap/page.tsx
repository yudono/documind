import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SapPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sap Conector</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Sap Conector is a tool that allows you to connect Sap with other
            applications and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
