import {SystemDAO} from "../dao/index.js";
import fs from "node:fs/promises";
import JsZip from "jszip";

export async function doBackup(bot) {
    const info = await SystemDAO.getBackupInfo();
    const now = new Date().getTime();

    const backupInterval = await SystemDAO.getParameter("backup_interval", 24 * 60 * 60 * 1000);
    if (now - info.last_backup_data <= backupInterval) return;

    const admin = await SystemDAO.getAdminId();
    if (admin) {
        try {
            const fileData = await fs.readFile('./db.sqlite');

            const zip = new JsZip();
            zip.file('db.sqlite', fileData);
            const buffer = await zip.generateAsync({type: 'nodebuffer'});

            await bot.telegram.sendDocument(admin.id, {
                source: buffer,
                filename: `db_backup_${now}.zip`
            }, {
                caption: `Backup ${new Date().toLocaleDateString()}`
            });
        } catch (err) {
            console.error(`Unable to send backup to Admin: ${err}`);
        }
    } else {
        console.warn("There is no admin defined. Backup skipped");
    }

    await SystemDAO.updateBackupInfo(Object.assign(info, {last_backup_data: now}));
}
