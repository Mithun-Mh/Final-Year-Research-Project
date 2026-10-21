import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system/next';
import { Alert, Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';

// Reports directory inside the app's document storage
const getReportDir = () => new Directory(Paths.document, 'TestReports');

export interface SavedReportInfo {
    uri: string;
    name: string;
    isDirectory: boolean;
    sizeInBytes?: number;
    modified?: string; // Formatted date string
}

export const ReportService = {
    ensureDirExists() {
        const dir = getReportDir();
        if (!dir.exists) {
            dir.create();
        }
        return dir;
    },

    async generatePDF(html: string, filename: string): Promise<string | null> {
        try {
            console.log("Generating PDF for:", filename);
            const reportDir = this.ensureDirExists();

            // Print to a temp file
            const { uri: tempUri } = await Print.printToFileAsync({ html });
            console.log("Temp PDF URI:", tempUri);

            // Build destination File
            const destFile = new File(reportDir, filename);

            // Delete existing file at destination if it exists
            if (destFile.exists) {
                destFile.delete();
            }

            // Move temp file to our reports directory with the new name
            const tempFile = new File(tempUri);
            tempFile.move(destFile);

            console.log("Saved PDF to:", destFile.uri);
            return destFile.uri;
        } catch (error) {
            console.error("Error generating/saving PDF:", error);
            Alert.alert("Error", "Failed to generate report PDF.");
            return null;
        }
    },

    async sharePDF(uri: string) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert("Error", "Sharing is not available on this device.");
        }
    },

    async downloadPDF(uri: string) {
        const filenameMatch = uri.match(/\/([^\/?#]+)$/i);
        const filename = filenameMatch ? filenameMatch[1] : 'report.pdf';

        if (Platform.OS === 'android') {
            try {
                const permissions = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                    const base64 = await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });
                    const newUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf');
                    await FileSystemLegacy.writeAsStringAsync(newUri, base64, { encoding: 'base64' });
                    Alert.alert("Success", "Report downloaded successfully!");
                }
            } catch (error) {
                console.error("Error downloading PDF:", error);
                Alert.alert("Error", "Failed to download report PDF.");
            }
        } else {
            // For iOS, the standard way to 'Save to Files' is via the share sheet
            await this.sharePDF(uri);
        }
    },

    listSavedReports(): SavedReportInfo[] {
        try {
            const reportDir = this.ensureDirExists();
            const contents = reportDir.list();

            const reports: SavedReportInfo[] = [];
            for (const item of contents) {
                if (item instanceof File && item.name.endsWith('.pdf')) {
                    reports.push({
                        uri: item.uri,
                        name: item.name,
                        isDirectory: false,
                        sizeInBytes: item.size,
                        modified: item.modificationTime
                            ? new Date(item.modificationTime).toLocaleDateString()
                            : undefined
                    });
                }
            }
            return reports.sort((a, b) =>
                b.modified && a.modified ? b.modified.localeCompare(a.modified) : 0
            );
        } catch (error) {
            console.error("Error listing reports:", error);
            return [];
        }
    },

    deleteReport(uri: string): boolean {
        try {
            const file = new File(uri);
            if (file.exists) file.delete();
            return true;
        } catch (error) {
            console.error("Error deleting report:", error);
            return false;
        }
    },

    generateGradingHTML(data: any) {
        const { batchId, result, params } = data;

        // Logic to determine grade and colors (Mirroring GradingScreen logic)
        const prediction = (result?.predictedClass || "").toLowerCase();
        let grade = "Ungraded";
        let isGood = false;

        if (prediction.includes("good")) { grade = "RSS 1"; isGood = true; }
        else if (prediction.includes("pin")) { grade = "RSS 2"; isGood = false; }
        else if (prediction.includes("reaper")) { grade = "RSS 3"; isGood = false; }

        const gradeColor = isGood ? "#2E7D32" : "#E65100";
        const gradeBg = isGood ? "#E8F5E9" : "#FFF3E0";
        const defectColor = isGood ? "#2E7D32" : "#D32F2F";
        const defectBg = isGood ? "#E8F5E9" : "#FFEBEE";

        return `
            <html>
            <head>
                <style>
                    body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                    h1 { color: #2E7D32; margin-top: 0; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #EEE; padding-bottom: 10px; margin-bottom: 20px; }
                    
                    /* New Grid for Split View */
                    .result-grid { display: flex; gap: 15px; margin-bottom: 20px; }
                    .result-card { flex: 1; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #EEE; }
                    
                    .label { font-size: 12px; text-transform: uppercase; color: #777; margin-bottom: 5px; font-weight: bold; }
                    .value-large { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                    
                    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .meta-table td { padding: 10px; border-bottom: 1px solid #F0F0F0; }
                    .meta-label { font-weight: bold; color: #555; width: 40%; }
                    
                    .suggestions { background-color: #FFF9C4; padding: 15px; border-radius: 10px; margin-top: 20px; }
                    .suggestion-title { color: #FBC02D; font-weight: bold; margin-bottom: 10px; font-size: 16px; }
                    .suggestion-list { list-style-type: none; padding: 0; margin: 0; }
                    .suggestion-item { margin-bottom: 8px; padding-left: 15px; position: relative; }
                    .suggestion-item:before { content: "•"; color: #FBC02D; position: absolute; left: 0; font-weight: bold; }
                    
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Rubber Grading Report</h1>
                        <div>Batch ID: <strong>${batchId}</strong></div>
                    </div>
                    <div style="text-align: right;">
                        <div>${new Date().toLocaleDateString()}</div>
                        <div style="color: #888; font-size: 12px;">RubberEX Intelligence</div>
                    </div>
                </div>

                <div class="result-grid">
                    <!-- Defect Type Card -->
                    <div class="result-card" style="background-color: ${defectBg}; border-color: ${defectColor}30;">
                        <div class="label">Defect Type</div>
                        <div class="value-large" style="color: ${defectColor}; font-size: 20px;">
                            ${result?.predictedClass || 'N/A'}
                        </div>
                         <div class="badge" style="background-color: ${defectColor}20; color: ${defectColor};">
                            SEVERITY: ${result?.severity || 'UNKNOWN'}
                        </div>
                    </div>

                    <!-- Quality Grade Card -->
                    <div class="result-card" style="background-color: ${gradeBg}; border-color: ${gradeColor}30;">
                        <div class="label">Quality Grade</div>
                        <div class="value-large" style="color: ${gradeColor}; font-size: 32px;">
                            ${grade}
                        </div>
                        <div class="badge" style="background-color: ${gradeColor}20; color: ${gradeColor};">
                            ${isGood ? 'PREMIUM QUALITY' : 'STANDARD QUALITY'}
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 30px; color: #666; font-size: 14px;">
                    AI Confidence Score: <strong>${(result?.confidence * 100).toFixed(1)}%</strong>
                </div>

                <h3>Test Information</h3>
                <table class="meta-table">
                    <tr><td class="meta-label">Tester Name</td><td>${params?.testerName || '-'}</td></tr>
                    <tr><td class="meta-label">Sheet Count</td><td>${params?.sheetCount || '-'}</td></tr>
                    <tr><td class="meta-label">Total Weight</td><td>${params?.sheetWeight ? params.sheetWeight + ' kg' : '-'}</td></tr>
                    <tr><td class="meta-label">Test Date</td><td>${params?.testDate || '-'}</td></tr>
                    <tr><td class="meta-label">Test Time</td><td>${params?.testTime || '-'}</td></tr>
                </table>

                ${result?.suggestions ? `
                <div class="suggestions">
                    <div class="suggestion-title">AI Suggestions & Recommendations</div>
                    <ul class="suggestion-list">
                        ${result.suggestions.split(/\r?\n/).map((s: string) => `<li class="suggestion-item">${s.replace(/^•\s*/, '')}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="footer">
                    Generated automatically by RubberEX Grading System. This is a computer-generated document and may be valid without a signature.
                </div>
            </body>
            </html>
        `;
    },

    generateLatexHTML(data: { result: any, testId: string, testDate: string, testTime: string, testerName?: string }) {
        const { result, testId, testDate, testTime, testerName } = data;
        const { qualityGrade, qualityScore, confidence, status, sensorReadings, recommendations } = result;

        const getStatusColor = (status: string) => {
            if (status === 'Pass') return '#10B981';
            if (status === 'Warning') return '#F59E0B';
            return '#EF4444';
        };

        const statusColor = getStatusColor(status);

        return `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1F2937; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-text { font-size: 24px; font-weight: bold; color: #166534; }
                    .report-title { font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .summary-card { background: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #E5E7EB; }
                    .grade-section { text-align: center; margin-bottom: 20px; }
                    .grade-label { font-size: 14px; color: #6B7280; margin-bottom: 4px; }
                    .grade-value { font-size: 42px; font-weight: 800; color: ${statusColor}; margin-bottom: 4px; }
                    .score-value { font-size: 18px; color: #374151; font-weight: 600; }
                    
                    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
                    .meta-item { display: flex; flex-direction: column; }
                    .meta-label { font-size: 12px; color: #6B7280; font-weight: 600; text-transform: uppercase; }
                    .meta-value { font-size: 16px; color: #111827; font-weight: 500; }

                    .section-title { font-size: 18px; font-weight: 700; color: #1F2937; margin-bottom: 16px; margin-top: 30px; display: flex; align-items: center; }
                    .sensor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
                    .sensor-card { background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; }
                    .sensor-val { font-size: 20px; font-weight: 700; color: #1F2937; margin-top: 8px; }
                    .sensor-name { font-size: 12px; color: #6B7280; }

                    .rec-list { list-style: none; padding: 0; }
                    .rec-item { background: #FFF7ED; border-left: 4px solid #F59E0B; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 4px 4px 0; font-size: 14px; color: #92400E; }

                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="logo-text">RubberEX</div>
                        <div class="report-title">Latex Quality Certificate</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="meta-value">${testId}</div>
                        <div class="meta-label">Test ID</div>
                    </div>
                </div>

                <div class="summary-card">
                    <div class="grade-section">
                        <div class="grade-label">Overall Quality Grade</div>
                        <div class="grade-value">${qualityGrade}</div>
                        <div class="score-value">Score: ${qualityScore}/100 • Status: ${status}</div>
                    </div>
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date Tested</span>
                            <span class="meta-value">${testDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${testTime}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Tester</span>
                            <span class="meta-value">${testerName || 'Authorized Personnel'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Confidence</span>
                            <span class="meta-value">${(confidence * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div class="section-title">Sensor Analysis</div>
                <div class="sensor-grid">
                    <div class="sensor-card">
                        <div class="sensor-name">Temperature</div>
                        <div class="sensor-val">${sensorReadings.temperature}°C</div>
                    </div>
                    <div class="sensor-card">
                        <div class="sensor-name">Turbidity</div>
                        <div class="sensor-val">${sensorReadings.turbidity} NTU</div>
                    </div>
                    <div class="sensor-card">
                        <div class="sensor-name">pH Level</div>
                        <div class="sensor-val">${sensorReadings.pH}</div>
                    </div>
                </div>

                <div class="section-title">AI Recommendations</div>
                <ul class="rec-list">
                    ${recommendations.map((rec: string) => `<li class="rec-item">${rec}</li>`).join('')}
                </ul>

                <div class="footer">
                    <p>Generated by RubberEX Intelligence System • Valid without signature</p>
                    <p>${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;
    },

    generatePriceForecastHTML(data: { type: string, grade: string, items: any[] }) {
        const { type, grade, items } = data;
        const title = type === 'prediction' ? 'Price Predictions' : 'Historical Prices';

        return `
            <html>
            <head>
                <style>
                    body { font-family: Helvetica, Arial, sans-serif; padding: 30px; }
                    h1 { color: #2E7D32; margin-bottom: 5px; }
                    .header { border-bottom: 2px solid #2E7D32; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .meta { color: #666; font-size: 14px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { text-align: left; padding: 12px; background-color: #f8f9fa; border-bottom: 2px solid #ddd; color: #333; }
                    td { padding: 12px; border-bottom: 1px solid #eee; color: #555; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    
                    .price { font-weight: bold; color: #2E7D32; }
                    .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Rubber Price Report</h1>
                        <div class="meta">${title} • Grade: <strong>${grade}</strong></div>
                    </div>
                    <div class="meta">
                        Generated: ${new Date().toLocaleDateString()}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Grade</th>
                            <th>Forecasted Price (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                        <tr>
                            <td>${item.date}</td>
                            <td>${item.grade}</td>
                            <td class="price">${item.price.toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Rubber Intelligence Agent • Automated Market Analysis</p>
                </div>
            </body>
            </html>
        `;
    }
};
