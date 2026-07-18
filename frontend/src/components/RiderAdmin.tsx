import { useState } from "react";
import axios from "axios";
import { adminService } from "../main";
import toast from "react-hot-toast";
import { BiPhone, BiCard, BiCycling, BiLoader } from "react-icons/bi";

interface RiderAdminProps {
  rider: any;
  onVerify: () => void;
}

const RiderAdmin = ({ rider, onVerify }: RiderAdminProps) => {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await axios.patch(
        `${adminService}/api/v1/admin/rider/verify/${rider._id}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Rider verified!");
      onVerify();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="overflow-hidden glass-card">
      {/* Profile picture */}
      <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={
            rider.picture ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
          }
          alt="Rider avatar"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100"
        >
          Pending
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="space-y-1 text-[11px] font-mono" style={{ color: "var(--color-manifest)" }}>
          <p className="flex items-center gap-1.5"><BiPhone className="text-xs" style={{ color: "var(--color-route)" }} /> <span>Phone: {rider.phoneNumber || "—"}</span></p>
          <p className="flex items-center gap-1.5"><BiCard className="text-xs" style={{ color: "var(--color-route)" }} /> <span>Aadhar: {rider.aadharNumber || "—"}</span></p>
          <p className="flex items-center gap-1.5"><BiCycling className="text-xs" style={{ color: "var(--color-route)" }} /> <span>Licence: {rider.drivingLicenseNumber || "—"}</span></p>
        </div>

        {/* Aadhaar document photo */}
        {rider.aadharImage && (
          <div className="space-y-1">
            <p className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-400">Aadhaar Document</p>
            <a href={rider.aadharImage} target="_blank" rel="noreferrer" title="View full Aadhaar">
              <img
                src={rider.aadharImage}
                alt="Aadhaar document"
                className="w-full h-20 object-cover rounded-xl border cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: "var(--color-rule)" }}
              />
            </a>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={async () => {
              setVerifying(true);
              try {
                await axios.delete(
                  `${adminService}/api/v1/admin/rider/${rider._id}`,
                  { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                );
                toast.success("Rider rejected!");
                onVerify();
              } catch (err: any) {
                toast.error(err.response?.data?.message || "Rejection failed");
              } finally {
                setVerifying(false);
              }
            }}
            disabled={verifying}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {verifying ? <BiLoader className="animate-spin mx-auto text-base" /> : "Reject"}
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex-[2] h-10 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            {verifying ? <BiLoader className="animate-spin mx-auto text-base" /> : "Approve Rider"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderAdmin;
