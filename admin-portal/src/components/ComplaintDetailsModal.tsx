import React, { useState } from 'react';
import {
  X,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  Camera,
  CheckCircle,
  Copy,
  ExternalLink,
  Bot,
  Trash2
} from 'lucide-react';
import { Ticket, EvidenceMedia } from '../types';
import { resolveMediaUrl } from '../services/api';

interface ComplaintDetailsModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUpdate?: (ticket: Ticket) => void;
  onInspectEvidence?: (evidence: any) => void;
  onResolveTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
}

export const ComplaintDetailsModal: React.FC<ComplaintDetailsModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onOpenUpdate,
  onInspectEvidence,
  onResolveTicket,
  onDeleteTicket
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [liveEvidenceList, setLiveEvidenceList] = useState<EvidenceMedia[]>([]);

  React.useEffect(() => {
    if (isOpen && ticket) {
      if (ticket.evidence && ticket.evidence.length > 0) {
        setLiveEvidenceList(ticket.evidence);
      } else {
        fetch(`/api/evidence/ticket/${ticket.id}`)
          .then(res => res.json())
          .then(json => {
            if (json.success && json.data) {
              setLiveEvidenceList(json.data);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const primaryEvidence = liveEvidenceList.length > 0
    ? liveEvidenceList[0]
    : (ticket.evidence && ticket.evidence.length > 0 ? ticket.evidence[0] : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-lg text-white">Complaint & Evidence Dossier</span>
                <span className="font-mono text-xs font-bold text-sky-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  {ticket.ticket_number}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  ticket.type === 'CRIME_FIR'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {ticket.type === 'CRIME_FIR' ? '🚨 Police Crime FIR' : '🛠️ Civic Grievance'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reported {new Date(ticket.created_at || Date.now()).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Status & Title Summary */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {ticket.priority} PRIORITY
                </span>
                <span className="text-xs text-slate-400 font-mono">Category: {ticket.category}</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">{ticket.title}</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{ticket.address_text}</span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className={`inline-block px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider ${
                ticket.status === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : ticket.status === 'REJECTED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                STATUS: {ticket.status}
              </span>
            </div>
          </div>

          {/* Citizen Complainant Info + Routing Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Citizen Details */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                <span>Complainant Details</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Citizen Name:</span>
                  <span className="font-bold text-white text-sm">{ticket.citizen_name || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Phone Contact:</span>
                  <span className="font-mono text-slate-200">{ticket.citizen_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-mono text-slate-200">{ticket.citizen_email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <span className="font-mono text-slate-300">
                    {ticket.lat.toFixed(5)}°N, {ticket.lng.toFixed(5)}°E
                  </span>
                </div>
              </div>
            </div>

            {/* Department & Officer Assignment */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-400" />
                <span>Department Routing & Assignment</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Assigned Department:</span>
                  <span className="font-bold text-white">{ticket.department_name || ticket.department_code}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Jurisdiction Geofence:</span>
                  <span className="text-slate-200">{ticket.jurisdiction_name || 'Downtown Zone'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Station / Dispatch Desk:</span>
                  <span className="text-slate-200">{ticket.station_name || 'Station 01'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Assigned Responder:</span>
                  <span className="font-bold text-emerald-400">
                    {ticket.assigned_officer_name || 'Pending Dispatch'}
                    {ticket.assigned_unit ? ` [Unit: ${ticket.assigned_unit}]` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Incident Description */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Full Incident Description</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Photographic Evidence & AI Forensic Verification Card */}
          {primaryEvidence ? (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span>Media Evidence & AI Tamper Forensics</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    primaryEvidence.authenticity_score >= 85
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AI Authenticity: {primaryEvidence.authenticity_score}% ({primaryEvidence.ai_verdict})</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Viewer */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Original Ingest Capture</div>
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
                    <img
                      src={resolveMediaUrl(primaryEvidence.storage_url)}
                      alt="Incident Evidence"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-sky-300 border border-white/10">
                      {primaryEvidence.captured_via_camera ? '📸 In-App Camera Shutter' : '📁 Direct File Ingest'}
                    </div>
                  </div>
                </div>

                {/* ELA Compression Heatmap Preview */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-purple-400 uppercase">ELA Compression Heatmap</div>
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-purple-500/40 relative shadow-inner">
                    <img
                      src={resolveMediaUrl(primaryEvidence.ela_heatmap_url || primaryEvidence.storage_url)}
                      alt="ELA Heatmap"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Forensic Details Bar */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Deepfake Probability</div>
                    <div className="font-bold text-purple-400 text-sm">
                      {Math.round((primaryEvidence.deepfake_probability || 0.02) * 100)}%
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Hardware Model</div>
                    <div className="font-mono font-bold text-slate-200 text-xs truncate">
                      {primaryEvidence.device_model || 'Direct Sensor'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Sensor Signature</div>
                    <div className="font-bold text-emerald-400 text-xs">
                      {primaryEvidence.captured_via_camera ? 'Hardware Verified' : 'Standard Upload'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Forensic Tools</div>
                    {onInspectEvidence ? (
                      <button
                        onClick={() => onInspectEvidence(primaryEvidence)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                      >
                        Deep ELA Modal →
                      </button>
                    ) : (
                      <span className="text-slate-400 font-mono">Passed</span>
                    )}
                  </div>
                </div>

                {/* SHA-256 Seal */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>SHA-256 Legal Chain of Custody Seal:</span>
                    <button
                      onClick={() => copyToClipboard(primaryEvidence.sha256_hash)}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedHash ? 'Copied!' : 'Copy Hash'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    {primaryEvidence.sha256_hash}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
              No photographic evidence was uploaded with this complaint.
            </div>
          )}

          {/* Official Resolution Notes */}
          {ticket.resolution_notes && (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Official Resolution & Dispatch Action Notes</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">
                {ticket.resolution_notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Close Dossier
            </button>

            {onDeleteTicket && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteTicket(ticket);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs transition flex items-center gap-1.5"
                title="Permanently expunge this case and all forensic files"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Case</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ticket.status !== 'RESOLVED' && ticket.status !== 'REJECTED' && onResolveTicket && (
              <button
                onClick={() => {
                  onResolveTicket(ticket);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            )}

            {onOpenUpdate && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUpdate(ticket);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <span>Dispatch / Update Status</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
