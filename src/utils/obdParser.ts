// src/utils/obdParser.ts

export interface ParsedPID {
  name: string;
  value: number | string;
  unit: string;
  rawHex: string;
}
/* eslint-disable no-bitwise */
// PIDs supportés avec formules de décodage
const PID_DEFINITIONS: Record<
  string,
  {
    name: string;
    unit: string;
    decode: (bytes: number[]) => number | string;
  }
> = {
  '00': {
    name: 'PIDs supportés [01-20]',
    unit: 'bitmap',
    decode: b => `0x${b.map(x => x.toString(16).padStart(2, '0')).join('')}`,
  },
  '0C': {
    name: 'Régime moteur',
    unit: 'tr/min',
    decode: b => (b[0] * 256 + b[1]) / 4,
  },
  '0D': {
    name: 'Vitesse véhicule',
    unit: 'km/h',
    decode: b => b[0],
  },
  '05': {
    name: 'Température liquide refroidissement',
    unit: '°C',
    decode: b => b[0] - 40,
  },
  '0F': {
    name: 'Température air admission',
    unit: '°C',
    decode: b => b[0] - 40,
  },
  '10': {
    name: 'Débit carburant MAF',
    unit: 'g/s',
    decode: b => (b[0] * 256 + b[1]) / 100,
  },
  '11': {
    name: 'Position papillon',
    unit: '%',
    decode: b => (b[0] * 100) / 255,
  },
  '1F': {
    name: 'Temps depuis démarrage moteur',
    unit: 's',
    decode: b => b[0] * 256 + b[1],
  },
  '21': {
    name: 'Distance voyant MIL allumé',
    unit: 'km',
    decode: b => b[0] * 256 + b[1],
  },
  '2F': {
    name: 'Niveau carburant',
    unit: '%',
    decode: b => (b[0] * 100) / 255,
  },
  '46': {
    name: 'Température ambiante',
    unit: '°C',
    decode: b => b[0] - 40,
  },
};

export class OBDParser {
  // Parse une réponse OBD brute
  static parseResponse(rawResponse: string): {
    mode: string;
    pid: string;
    data: number[];
    raw: string;
  } | null {
    // Nettoyer la réponse
    const clean = rawResponse
      .replace(/\r/g, '')
      .replace(/\n/g, ' ')
      .replace(/STOPPED/g, '')
      .replace(/SEARCHING/g, '')
      .replace(/UNABLE TO CONNECT/g, '')
      .trim();

    // Format attendu: "41 0C 1B 56" ou "7E8 04 41 0C 1B 56 00 00 00"
    const bytes = clean
      .split(' ')
      .filter(b => /^[0-9A-Fa-f]{1,2}$/.test(b))
      .map(b => parseInt(b, 16));

    if (bytes.length < 2) return null;

    // Détection format CAN (avec header)
    let startIndex = 0;
    if (bytes.length > 6 && bytes[1] === 0x04) {
      // Format CAN avec header 7E8
      startIndex = 2;
    }

    const mode = (bytes[startIndex] - 0x40)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    const pid = bytes[startIndex + 1]
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    const data = bytes.slice(startIndex + 2);

    return {mode, pid, data, raw: clean};
  }

  // Parse un PID spécifique
  static parsePID(pid: string, dataBytes: number[]): ParsedPID | null {
    const definition = PID_DEFINITIONS[pid.toUpperCase()];
    if (!definition) return null;

    return {
      name: definition.name,
      value: definition.decode(dataBytes),
      unit: definition.unit,
      rawHex: dataBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
    };
  }

  // Parse les codes défaut (Mode 03)
  static parseDTCs(data: number[]): string[] {
    const dtcs: string[] = [];

    for (let i = 0; i < data.length - 1; i += 2) {
      const byte1 = data[i];
      const byte2 = data[i + 1];

      if (byte1 === 0 && byte2 === 0) continue; // Padding

      const dtc = this.bytesToDTC(byte1, byte2);
      if (dtc && dtc !== 'P0000') {
        dtcs.push(dtc);
      }
    }

    return dtcs;
  }

  // Convertit 2 bytes en code DTC (ex: 0x01, 0x03 -> P0103)
  private static bytesToDTC(byte1: number, byte2: number): string {
    // Conversion explicite en entiers non signés 8-bit
    const b1 = Math.floor(Math.abs(byte1)) & 0xff;
    const b2 = Math.floor(Math.abs(byte2)) & 0xff;

    // Premier caractère catégorie
    const typeBits = (b1 >>> 6) & 0x03;
    const type = ['P', 'C', 'B', 'U'][typeBits];

    // Deuxième caractère premier chiffre (0-3)
    const digit1 = (b1 >>> 4) & 0x03;

    // Troisième caractère deuxième chiffre (0-9)
    const digit2 = b1 & 0x0f;

    // 3ème et 4ème caractères
    const digit3 = (b2 >>> 4) & 0x0f;
    const digit4 = b2 & 0x0f;

    return `${type}${digit1}${digit2.toString(16).toUpperCase()}${digit3
      .toString(16)
      .toUpperCase()}${digit4.toString(16).toUpperCase()}`;
  }

  // Parse VIN (Mode 09, PID 02)
  static parseVIN(data: number[]): string {
    return data.map(b => String.fromCharCode(b)).join('');
  }
}
