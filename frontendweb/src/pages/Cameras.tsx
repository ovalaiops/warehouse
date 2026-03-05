import React, { useState } from "react";
import { Card } from "@/components/common/Card";
import { CameraGrid } from "@/components/dashboard/CameraGrid";
import { CameraPlayer } from "@/components/cameras/CameraPlayer";
import { Button } from "@/components/common/Button";
import { ArrowLeft, Grid3X3, Grid2X2 } from "lucide-react";

const cameraDetails: Record<string, { name: string; zone: string }> = {
  "cam-1": { name: "Dock Entry A", zone: "Receiving" },
  "cam-2": { name: "Aisle A3-A4", zone: "Storage" },
  "cam-3": { name: "Loading Dock B", zone: "Shipping" },
  "cam-4": { name: "Cold Storage C", zone: "Cold Zone" },
  "cam-5": { name: "Picking Area 1", zone: "Picking" },
  "cam-6": { name: "Main Corridor", zone: "General" },
};

const Cameras: React.FC = () => {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<2 | 3>(3);

  if (selectedCamera) {
    const details = cameraDetails[selectedCamera] || {
      name: "Unknown Camera",
      zone: "Unknown",
    };
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCamera(null)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Grid
          </Button>
          <h1 className="text-xl font-bold text-text-primary">
            {details.name}
          </h1>
        </div>

        <CameraPlayer
          cameraId={selectedCamera}
          cameraName={details.name}
          zone={details.zone}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cameras</h1>
          <p className="text-sm text-text-muted mt-1">
            6 cameras configured, 5 active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGridSize(2)}
            className={`p-2 rounded-button transition-colors ${
              gridSize === 2
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize(3)}
            className={`p-2 rounded-button transition-colors ${
              gridSize === 3
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card padding="sm">
        <CameraGrid columns={gridSize} onCameraClick={setSelectedCamera} />
      </Card>
    </div>
  );
};

export default Cameras;
