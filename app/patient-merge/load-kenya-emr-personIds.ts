import ConnectionManager from '../connection-manager';

const connection = ConnectionManager.getInstance();

export default async function fetchKenyaEmrPersonIDs(limit: number) {
    const kenyaEmrConnection = await connection.getConnectionKenyaemr();
    const sql = `select patient_id from kenya_emr.patient limit ${limit}`;
    let results:any[] = await connection.query(sql, kenyaEmrConnection);
    return  results;
}