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
  static parseDTCs(data: string): string[] {
    const dtcs: string[] = [];
    // Le format ELM327 pour le mode 03 est souvent des paires d'octets en hexadécimal.
    // "43 01 03 01 04 00 00" -> 43 (mode 3 response), puis couples d'octets.
    // On nettoie d'abord les caractères parasites
    const clean = data
      .replace(/>/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s/g, '');

    // Ignorer le header de réponse (43 ou 43xx)
    let start = 0;
    if (clean.startsWith('43')) {
      start = 2;
    }

    for (let i = start; i < clean.length - 3; i += 4) {
      const byte1Hex = clean.substring(i, i + 2);
      const byte2Hex = clean.substring(i + 2, i + 4);

      if (!/^[0-9A-Fa-f]{2}$/.test(byte1Hex) || !/^[0-9A-Fa-f]{2}$/.test(byte2Hex)) {
        continue;
      }

      const byte1 = parseInt(byte1Hex, 16);
      const byte2 = parseInt(byte2Hex, 16);

      if (byte1 === 0 && byte2 === 0) continue; // Padding

      const dtc = this.bytesToDTC(byte1, byte2);
      if (dtc && dtc !== 'P0000') {
        dtcs.push(dtc);
      }
    }

    return dtcs;
  }

  // Parse les codes défaut via UDS Mode 19 (tous systèmes : SRS airbag, BCM portes, ABS)
  // Format réponse : "59 02 FF XX XX XX XX ..." où chaque DTC = 3 octets (2 code + 1 status)
  static parseDTCsExtended(data: string): string[] {
    const dtcs: string[] = [];
    const clean = data
      .replace(/>/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s/g, '');

    // Chercher le header de réponse UDS 5902 ou 590209
    let start = 0;
    const idx5902 = clean.indexOf('5902');
    if (idx5902 !== -1) {
      // Sauter "5902" + 2 octets de status mask = 8 chars
      start = idx5902 + 8;
    } else {
      return dtcs;
    }

    // Chaque DTC = 3 octets (6 chars hex) : 2 octets code + 1 octet status
    for (let i = start; i + 5 < clean.length; i += 6) {
      const byte1Hex = clean.substring(i, i + 2);
      const byte2Hex = clean.substring(i + 2, i + 4);
      // byte3 = status, on l'ignore pour le parsing

      if (!/^[0-9A-Fa-f]{2}$/.test(byte1Hex) || !/^[0-9A-Fa-f]{2}$/.test(byte2Hex)) {
        continue;
      }

      const byte1 = parseInt(byte1Hex, 16);
      const byte2 = parseInt(byte2Hex, 16);

      if (byte1 === 0 && byte2 === 0) continue;

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
