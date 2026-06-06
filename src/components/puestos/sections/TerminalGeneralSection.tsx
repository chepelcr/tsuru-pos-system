import { Monitor } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { Input, FormLabel } from "@/components/ui";

interface TerminalGeneralSectionProps {
  name: string;
  setName: (value: string) => void;
  code: number | "";
  setCode: (value: number | "") => void;
  deviceId: string;
  setDeviceId: (value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TerminalGeneralSection({
  name,
  setName,
  code,
  setCode,
  deviceId,
  setDeviceId,
  isExpanded,
  onToggle,
}: TerminalGeneralSectionProps) {
  return (
    <SectionWrapper
      title="Información General"
      icon={Monitor}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <FormLabel htmlFor="t-name" required>
            Nombre
          </FormLabel>
          <Input
            id="t-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Caja 1"
          />
        </div>

        {/* Code */}
        <div>
          <FormLabel htmlFor="t-code" required>
            Código
          </FormLabel>
          <Input
            id="t-code"
            required
            type="number"
            min={1}
            value={code}
            onChange={(e) => setCode(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="ej. 1"
            className="font-mono"
          />
        </div>

        {/* Device ID */}
        <div>
          <FormLabel htmlFor="t-device">ID de dispositivo</FormLabel>
          <Input
            id="t-device"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="ej. tablet-01 (opcional)"
            className="font-mono"
          />
          <p className="t-xs mt-1 text-muted-foreground">
            Identificador del dispositivo físico. Opcional.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
