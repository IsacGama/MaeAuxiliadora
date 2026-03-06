const onlyAscii = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

const crc16Ccitt = (value: string) => {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

type PixPayloadOptions = {
  key: string;
  keyType?: string;
  merchantName?: string;
  merchantCity?: string;
  description?: string;
};

const normalizePixKey = (rawKey: string, rawType?: string) => {
  const key = rawKey.trim();
  const keyType = rawType?.trim().toUpperCase();

  if (!keyType) {
    return key;
  }

  if (keyType === "CPF") {
    const digits = key.replace(/\D/g, "");
    return digits.length === 11 ? digits : key;
  }

  if (keyType === "CNPJ") {
    const digits = key.replace(/\D/g, "");
    return digits.length === 14 ? digits : key;
  }

  if (keyType === "PHONE") {
    const digits = key.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
    return key;
  }

  if (keyType === "EMAIL") {
    return key.toLowerCase();
  }

  return key;
};

export const buildPixPayload = (options: PixPayloadOptions) => {
  const key = normalizePixKey(options.key, options.keyType);
  if (!key) return null;

  const merchantName = (onlyAscii(options.merchantName || "ECLESIALHUB") || "ECLESIALHUB").slice(0, 25);
  const merchantCity = (onlyAscii(options.merchantCity || "BRASILIA") || "BRASILIA").slice(0, 15);
  const description = onlyAscii(options.description || "").slice(0, 72);

  const merchantAccountInfo = [
    tlv("00", "BR.GOV.BCB.PIX"),
    tlv("01", key),
    description ? tlv("02", description) : "",
  ].join("");

  const additionalData = tlv("05", "***");

  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("26", merchantAccountInfo),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("58", "BR"),
    tlv("59", merchantName),
    tlv("60", merchantCity),
    tlv("62", additionalData),
    "6304",
  ].join("");

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
};

export const buildPixQrImageUrl = (payload: string, size = 320) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
