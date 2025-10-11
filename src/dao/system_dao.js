import {models} from "../db/index.js";

export class SystemDAO {
    static async getParameter(key, defaultValue = null) {
        const data = await models.SystemSettings.findByPk(key);
        return data?.value ?? defaultValue;
    }

    static async updateParameters(key, value) {
        await models.SystemSettings.upsert({key, value});
    }

    static async getAdminId() {
        return this.getParameter("admin");
    }

    static async getBackupInfo() {
        return this.getParameter("backup_info", {last_backup_data: 0});
    }

    static async updateBackupInfo({last_backup_data}) {
        return this.updateParameters("backup_info", {last_backup_data});
    }
}