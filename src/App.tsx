import { useState } from 'react'
import { FolderOpen, FileText, Settings, Activity, ShieldCheck, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { processDocument, ProcessingResult, injectMetadata } from './lib/processor'
import { formatATQRCodeString } from './lib/at-formatter'
import { exportToExcel, exportToPDF } from './lib/exporter'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function App() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [results, setResults] = useState<ProcessingResult[]>([])
    const [logs, setLogs] = useState<string[]>([])

    const stats = {
        total: results.length,
        processed: results.filter(r => r.success).length,
        ignored: results.filter(r => !r.success).length
    }

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore - File System Access API
            const dirHandle = await window.showDirectoryPicker();
            setIsProcessing(true);
            const newResults: ProcessingResult[] = [];
            const newLogs = [`Starting process in: ${dirHandle.name}`];

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
                        newLogs.push(`Processing ${file.name}...`);
                        setLogs([...newLogs]);

                        const result = await processDocument(file);

                        if (result.success && result.data?.semantic?.emitenteNif) {
                            // Inject metadata if it's a PDF and we have enough data
                            const atString = formatATQRCodeString({
                                nifEmitente: result.data.semantic.emitenteNif,
                                nifAdquirente: result.data.semantic.adquirenteNif || '999999990',
                                paisAdquirente: 'PT',
                                tipoDocumento: 'FT', // Default to Invoice
                                estadoDocumento: 'N',
                                dataEmissao: result.data.semantic.data || new Date().toISOString().split('T')[0],
                                idDocumento: '1',
                                atcud: '0',
                                baseIsenta: 0,
                                baseTaxaReduzida: 0,
                                baseTaxaIntermedia: 0,
                                baseTaxaNormal: parseFloat(result.data.semantic.total || '0'),
                                ivaTaxaReduzida: 0,
                                ivaTaxaIntermedia: 0,
                                ivaTaxaNormal: 0,
                                totalImposto: 0,
                                totalDocumento: parseFloat(result.data.semantic.total || '0'),
                            });

                            result.data.atString = atString;

                            if (file.name.toLowerCase().endsWith('.pdf')) {
                                try {
                                    const updatedBlob = await injectMetadata(file, atString);
                                    // In a real PWA with write permission, we'd save it back. 
                                    // For now, we'll offer it in the result list or keep it in memory.
                                    result.data.updatedFile = updatedBlob;
                                    newLogs.push(`Success: Metadata injected into ${file.name}`);
                                } catch (e) {
                                    newLogs.push(`Warning: Could not inject metadata into ${file.name}`);
                                }
                            }
                        } else if (result.success) {
                            result.success = false;
                            result.reason = 'Missing mandatory fiscal data (NIF/Total)';
                            newLogs.push(`Ignored: ${file.name} - ${result.reason}`);
                        } else {
                            newLogs.push(`Error: ${file.name} - ${result.reason}`);
                        }

                        newResults.push(result);
                        setResults([...newResults]);
                    }
                }
            }

            newLogs.push('Process complete.');
            setLogs(newLogs);
            setIsProcessing(false);

            // Write log file back to folder if supported
            try {
                const logFileHandle = await dirHandle.getFileHandle('processing_log.txt', { create: true });
                const writable = await logFileHandle.createWritable();
                await writable.write(newLogs.join('\n'));
                await writable.close();
            } catch (e) {
                console.error('Could not write log file to folder', e);
            }

        } catch (err) {
            console.error(err);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen cyber-grid flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto">
            {/* Background Glow */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-secondary/10 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <main className="w-full max-w-6xl glass-card p-6 md:p-8 relative">
                <div className="absolute top-0 left-0 w-24 h-1 bg-cyber-accent"></div>
                <div className="absolute top-0 right-0 w-24 h-1 bg-cyber-secondary"></div>

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyber-accent to-cyber-secondary mb-2 tracking-tighter">
                            PDF-SEMANTICS PRO
                        </h1>
                        <p className="text-cyber-accent/60 text-sm font-mono tracking-widest uppercase">
                            Semantic Parser & QR Metadata Injector
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSelectFolder}
                            disabled={isProcessing}
                            className={cn("cyber-button flex items-center gap-2 group", isProcessing && "opacity-50 cursor-wait")}
                        >
                            <FolderOpen size={18} className="group-hover:scale-110 transition-transform" />
                            <span>{isProcessing ? 'Processing...' : 'Select Source Folder'}</span>
                        </button>
                    </div>
                </header>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <StatCard icon={<FileText className="text-cyber-accent" />} label="Total Found" value={stats.total} />
                    <StatCard icon={<ShieldCheck className="text-green-400" />} label="Validated" value={stats.processed} />
                    <StatCard icon={<AlertTriangle className="text-yellow-400" />} label="Ignored" value={stats.ignored} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[400px]">
                    {/* Results List */}
                    <div className="glass-card bg-black/40 p-4 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-mono text-cyber-accent mb-4 border-b border-cyber-border pb-2 inline-flex items-center gap-2">
                            <Activity size={12} /> DOCUMENT FEED
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {results.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-white/20 text-sm font-mono italic">
                                    NO DOCUMENTS LOADED
                                </div>
                            ) : (
                                results.map((res, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {res.success ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                                            <div>
                                                <p className="text-sm font-bold truncate max-w-[200px]">{res.fileName}</p>
                                                <p className="text-[10px] text-white/40 font-mono">
                                                    {res.success ? `NIF: ${res.data.semantic.emitenteNif || '??'} | TOTAL: ${res.data.semantic.total || '0'}` : res.reason}
                                                </p>
                                            </div>
                                        </div>
                                        {res.data?.updatedFile && (
                                            <button
                                                onClick={() => {
                                                    const url = URL.createObjectURL(res.data.updatedFile);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `MODIFIED_${res.fileName}`;
                                                    a.click();
                                                }}
                                                className="text-cyber-accent hover:text-white transition-colors"
                                                title="Download Modified PDF"
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* System Logs / Real-time Terminal */}
                    <div className="glass-card bg-black/60 p-4 border-cyber-accent/20 flex flex-col">
                        <h3 className="text-xs font-mono text-cyber-secondary mb-4 border-b border-cyber-accent/20 pb-2 flex items-center gap-2">
                            <Settings size={12} /> SYSTEM_KERNEL_LOG
                        </h3>
                        <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 text-cyber-accent/80 pr-2">
                            {logs.length === 0 && <p className="animate-pulse">_IDLE_WAITING_FOR_INPUT...</p>}
                            {logs.map((log, i) => (
                                <p key={i} className="flex gap-2">
                                    <span className="text-cyber-secondary opacity-50">[{new Date().toLocaleTimeString()}]</span>
                                    <span>{log}</span>
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <footer className="mt-8 pt-8 border-t border-cyber-border flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[10px] font-mono text-white/40 flex items-center gap-4">
                        <span>CORE: v1.0.4-STABLE</span>
                        <span>SECURE_ENCRYPTION: AES-256</span>
                    </div>

                    <div className="flex gap-4">
                        <button
                            disabled={results.length === 0}
                            onClick={() => exportToExcel(results)}
                            className={cn("cyber-button flex items-center gap-2", results.length === 0 && "opacity-30 cursor-not-allowed")}
                        >
                            <Download size={18} />
                            Export Excel
                        </button>
                        <button
                            disabled={results.length === 0}
                            onClick={() => exportToPDF(results)}
                            className={cn("cyber-button flex items-center gap-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-white", results.length === 0 && "opacity-30 cursor-not-allowed")}
                        >
                            <FileText size={18} />
                            Export PDF
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
    return (
        <div className="glass-card p-4 bg-white/5 border-white/10 hover:border-cyber-accent/50 transition-colors flex-1">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-3xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-br from-white to-white/30">
                {value.toString().padStart(3, '0')}
            </div>
        </div>
    )
}
