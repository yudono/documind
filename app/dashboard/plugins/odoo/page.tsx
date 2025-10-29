import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OdooPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Odoo Conector</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Odoo Conector is a tool that allows you to connect Odoo with other
            applications and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
