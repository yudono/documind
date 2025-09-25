export default function TemplatePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold">Templates</h1>
              <p className="text-sm text-muted-foreground">
                Find Template that fits your needs
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="p-4">
        <h2 className="text-lg font-semibold">Templates</h2>
      </div>
    </div>
  );
}
