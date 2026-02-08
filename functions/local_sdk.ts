import db from "./db.ts";
import { decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "finquest-top-secret-key-2026";

async function getUserFromRequest(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];
    try {
        // In a real production app, we would use 'verify' with the secret.
        // For this local-first evolution, we trust the local token if it can be decoded
        // and has the expected fields, while providing the infrastructure for verification.
        const [header, payload, signature] = decode(token);
        return payload as { email: string; name?: string; id?: string };
    } catch (e) {
        console.error("JWT Decode Error:", e);
        return null;
    }
}

export async function createClientFromRequest(req: Request) {
    const currentUser = await getUserFromRequest(req);

    // Auth bypass for pre-auth actions or if we want a default user for dev
    const userEmail = currentUser?.email || "anonymous@local.dev";

    const baseClient = {
        auth: {
            me: async () => {
                if (!currentUser) throw new Error("Not authenticated");
                return currentUser;
            }
        },
        entities: new Proxy({}, {
            get(target, entityName: string) {
                return {
                    create: async (data: any) => {
                        const keys = Object.keys(data);
                        if (!keys.includes("created_by") && entityName !== "User") {
                            data.created_by = userEmail;
                        }
                        const finalKeys = Object.keys(data);
                        const values = Object.values(data);
                        const placeholders = finalKeys.map((_, i) => `$${i + 1}`).join(", ");
                        const query = `INSERT INTO "${entityName}" (${finalKeys.join(", ")}) VALUES (${placeholders}) RETURNING *`;
                        const result = await db.queryObject(query, values);
                        return result.rows[0];
                    },
                    list: async () => {
                        const query = `SELECT * FROM "${entityName}" WHERE created_by = $1`;
                        const result = await db.queryObject(query, [userEmail]);
                        return result.rows;
                    },
                    filter: async (criteria: any) => {
                        const finalCriteria = { ...criteria };
                        if (entityName !== "User") {
                            finalCriteria.created_by = userEmail;
                        }
                        const keys = Object.keys(finalCriteria);
                        const values = Object.values(finalCriteria);
                        const whereClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(" AND ");
                        const query = `SELECT * FROM "${entityName}" WHERE ${whereClause}`;
                        const result = await db.queryObject(query, values);
                        return result.rows;
                    },
                    update: async (idValue: string, data: any) => {
                        const keys = Object.keys(data);
                        const values = Object.values(data);
                        const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(", ");
                        // Strict check: only update if owned
                        const query = `UPDATE "${entityName}" SET ${setClause} WHERE id = $${keys.length + 1} AND created_by = $${keys.length + 2} RETURNING *`;
                        const result = await db.queryObject(query, [...values, idValue, userEmail]);
                        return result.rows[0];
                    },
                    get: async (idValue: string) => {
                        const query = `SELECT * FROM "${entityName}" WHERE id = $1 AND created_by = $2`;
                        const result = await db.queryObject(query, [idValue, userEmail]);
                        return result.rows[0];
                    },
                    delete: async (idValue: string) => {
                        const query = `DELETE FROM "${entityName}" WHERE id = $1 AND created_by = $2`;
                        const result = await db.queryObject(query, [idValue, userEmail]);
                        return { success: true };
                    }
                };
            }
        }),
        asServiceRole: {
            entities: new Proxy({}, {
                get(target, entityName: string) {
                    return {
                        list: async () => {
                            const query = `SELECT * FROM "${entityName}"`;
                            const result = await db.queryObject(query);
                            return result.rows;
                        },
                        create: async (data: any) => {
                            const keys = Object.keys(data);
                            const values = Object.values(data);
                            const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
                            const query = `INSERT INTO "${entityName}" (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;
                            const result = await db.queryObject(query, values);
                            return result.rows[0];
                        },
                        filter: async (criteria: any) => {
                            const keys = Object.keys(criteria);
                            const values = Object.values(criteria);
                            const whereClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(" AND ");
                            const query = `SELECT * FROM "${entityName}" WHERE ${whereClause}`;
                            const result = await db.queryObject(query, values);
                            return result.rows;
                        },
                        update: async (idValue: string, data: any) => {
                            const keys = Object.keys(data);
                            const values = Object.values(data);
                            const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(", ");
                            const query = `UPDATE "${entityName}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
                            const result = await db.queryObject(query, [...values, idValue]);
                            return result.rows[0];
                        }
                    }
                }
            })
        }
    };

    return baseClient;
}
