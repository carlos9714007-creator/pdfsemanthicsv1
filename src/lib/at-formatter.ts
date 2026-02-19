export interface ATQRCodeData {
    nifEmitente: string;
    nifAdquirente: string;
    paisAdquirente: string;
    tipoDocumento: string;
    estadoDocumento: string;
    dataEmissao: string;
    idDocumento: string;
    atcud: string;
    baseIsenta: number;
    baseTaxaReduzida: number;
    ivaTaxaReduzida: number;
    baseTaxaIntermedia: number;
    ivaTaxaIntermedia: number;
    baseTaxaNormal: number;
    ivaTaxaNormal: number;
    totalImposto: number;
    totalDocumento: number;
    retencaoFonte?: number;
}

export function formatATQRCodeString(data: ATQRCodeData): string {
    // Format based on Portaria 195/2020
    // A:NIF*B:NIF*C:PAIS*D:TIPO*E:ESTADO*F:DATA*G:ID*H:ATCUD*...
    const fields: Record<string, string | number> = {
        A: data.nifEmitente,
        B: data.nifAdquirente,
        C: data.paisAdquirente,
        D: data.tipoDocumento,
        E: data.estadoDocumento,
        F: data.dataEmissao.replace(/-/g, ''), // YYYYMMDD
        G: data.idDocumento,
        H: data.atcud,
        I1: data.baseIsenta.toFixed(2),
        I3: data.baseTaxaReduzida.toFixed(2),
        I4: data.ivaTaxaReduzida.toFixed(2),
        I5: data.baseTaxaIntermedia.toFixed(2),
        I6: data.ivaTaxaIntermedia.toFixed(2),
        I7: data.baseTaxaNormal.toFixed(2),
        I8: data.ivaTaxaNormal.toFixed(2),
        N: data.totalImposto.toFixed(2),
        O: data.totalDocumento.toFixed(2),
    };

    return Object.entries(fields)
        .map(([key, value]) => `${key}:${value}`)
        .join('*');
}
