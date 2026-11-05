import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { fmtDate, fmtIDR, STATUS_COLORS, SERVICE_STATUSES, maskPhone } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";

const getPaymentStatus = (service) => {
  const paid = Math.max(0, Number(service.total_paid) || 0);
  const due = Math.max(0, Number(service.final_cost ?? service.estimated_cost) || 0);
  if (paid === 0) return { value: "unpaid", label: "Belum bayar", className: "border-red-200 bg-red-50 text-red-700" };
  if (paid >= due) return { value: "paid", label: "Lunas", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  return { value: "partial", label: "Belum lunas", className: "border-amber-200 bg-amber-50 text-amber-700" };
};

export default function Services() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [technicianId, setTechnicianId] = useState("all");
  const [payment, setPayment] = useState("all");
  const navigate = useNavigate();

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    const r = await api.get(`/services?${params.toString()}`);
    setItems(r.data);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load();  }, [q, status]);
  useEffect(() => {
    api.get("/technicians")
      .then((r) => setTechnicians(r.data))
      .catch((e) => toast.error(e.response?.data?.detail || "Gagal memuat daftar teknisi"));
  }, []);

  const filteredItems = useMemo(() => items.filter((service) => {
    const matchesTechnician = technicianId === "all"
      || (technicianId === "unassigned" ? !service.assigned_technician_id : service.assigned_technician_id === technicianId);
    const matchesPayment = payment === "all" || getPaymentStatus(service).value === payment;
    return matchesTechnician && matchesPayment;
  }), [items, technicianId, payment]);

  return (
    <div className="space-y-5" data-testid="services-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">Workflow</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Service</h1>
        </div>
        <Button data-testid="new-service-btn" onClick={() => navigate("/services/new")} className={`gap-2 ${user?.role === "teknisi" ? "hidden" : ""}`}>
          <Plus className="size-4" /> Penerimaan Baru
        </Button>
      </div>

      <Card className="border border-border">
        <div className="p-4 border-b border-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari nomor / IMEI / nama / perangkat..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} data-testid="services-search-input" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status service</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {SERVICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Teknisi</div>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger data-testid="technician-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Teknisi</SelectItem>
                <SelectItem value="unassigned">Belum ditugaskan</SelectItem>
                {technicians.map((technician) => <SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status pembayaran</div>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger data-testid="payment-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pembayaran</SelectItem>
                <SelectItem value="unpaid">Belum bayar</SelectItem>
                <SelectItem value="partial">Belum lunas</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Service</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Device</TableHead>
              <TableHead className="hidden md:table-cell">Dikerjakan oleh</TableHead>
              <TableHead className="hidden lg:table-cell">Keluhan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead className="hidden lg:table-cell">Estimasi</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal Masuk</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">{items.length === 0 ? "Belum ada service" : "Tidak ada service sesuai filter"}</TableCell></TableRow>}
            {filteredItems.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/services/${s.id}`)} data-testid={`service-row-${s.service_number}`}>
                <TableCell className="font-mono text-sm font-semibold text-primary">{s.service_number}</TableCell>
                <TableCell>
                  <div className="font-semibold">{s.customer_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{maskPhone(s.customer_phone, user?.role)}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {s.brand} {s.model}
                  {s.imei1 && <div className="hidden sm:block text-xs text-muted-foreground font-mono">{s.imei1}</div>}
                  <div className="text-xs text-muted-foreground md:hidden">Teknisi: {s.assigned_technician_name || "Belum ditugaskan"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{s.assigned_technician_name || "Belum ditugaskan"}</TableCell>
                <TableCell className="hidden lg:table-cell max-w-[220px]">
                  <div className="line-clamp-2 text-sm" title={s.complaint || ""}>{s.complaint || "-"}</div>
                </TableCell>
                <TableCell><span className={`status-pill ${STATUS_COLORS[s.status] || ""}`}>{s.status}</span></TableCell>
                <TableCell><Badge variant="outline" className={getPaymentStatus(s).className}>{getPaymentStatus(s).label}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell font-mono">{fmtIDR(s.estimated_cost)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(s.created_at)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {["Selesai", "Sudah Diambil"].includes(s.status)
                    ? fmtDate(s.completed_at || s.finished_at || s.status_history?.find((entry) => ["Selesai", "Sudah Diambil"].includes(entry.status))?.at)
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
