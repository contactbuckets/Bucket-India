import {useEffect,useMemo,useState} from "react";
import AppShell from "../components/AppShell";
import {useAuth} from "../context/AuthContext";
import {supabase} from "../lib/supabase";

const empty={billing_address:{line1:"",line2:"",city:"",state:"",pincode:"",country:"India"},gstin:"",gst_legal_name:"",bank_account_name:"",bank_account_number:"",bank_ifsc:"",bank_name:"",auto_confirm_orders:false,auto_confirm_cod:false,auto_confirm_prepaid:true,confirmation_delay_minutes:0,notify_new_orders:true,notify_ndr:true,notify_rto:true,notify_settlements:true,shipping_provider:"",default_shipping_mode:"standard"};

function Card({icon,title,eyebrow,description,children,action}){return <section className="settings-card"><div className="settings-card-head"><div className="settings-icon">{icon}</div><div><span className="section-kicker">{eyebrow}</span><h3>{title}</h3><p>{description}</p></div>{action}</div>{children}</section>}
function Field({label,children,wide=false}){return <label className={"settings-field"+(wide?" wide":"")}><span>{label}</span>{children}</label>}
function Toggle({label,description,checked,onChange}){return <label className="settings-toggle"><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i/></label>}

export default function SellerSettings(){
 const {session,profile,refreshProfile}=useAuth();
 const [form,setForm]=useState(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [password,setPassword]=useState({next:"",confirm:""}),[passwordMsg,setPasswordMsg]=useState("");
 const userId=session?.user?.id;
 const set=(key,value)=>setForm(x=>({...x,[key]:value}));
 const setAddress=(key,value)=>setForm(x=>({...x,billing_address:{...x.billing_address,[key]:value}}));

 useEffect(()=>{if(!userId)return;let alive=true;(async()=>{const {data,error}=await supabase.from("seller_settings").select("*").eq("user_id",userId).maybeSingle();if(!alive)return;if(error)setError(error.message);if(data)setForm({...empty,...data,billing_address:{...empty.billing_address,...(data.billing_address||{})}});setLoading(false)})();return()=>{alive=false}},[userId]);

 async function saveSettings(e){e?.preventDefault();if(!userId)return;setSaving(true);setMessage("");setError("");const payload={...form,user_id:userId,updated_at:new Date().toISOString()};const {data,error}=await supabase.from("seller_settings").upsert(payload,{onConflict:"user_id"}).select().single();setSaving(false);if(error)setError(error.message);else{setForm({...empty,...data,billing_address:{...empty.billing_address,...(data.billing_address||{})}});setMessage("Settings saved successfully.");}}
 async function changePassword(e){e.preventDefault();setPasswordMsg("");if(password.next.length<8)return setPasswordMsg("Use at least 8 characters.");if(password.next!==password.confirm)return setPasswordMsg("Passwords do not match.");const {error}=await supabase.auth.updateUser({password:password.next});if(error)setPasswordMsg(error.message);else{setPassword({next:"",confirm:""});setPasswordMsg("Password updated successfully.");}}
 const kycStatus=useMemo(()=>({verified:"Verified",submitted:"Under review",action_required:"Action required",pending:"Not submitted"}),[]);
 const [kyc,setKyc]=useState(null);
 useEffect(()=>{if(!userId)return;supabase.from("kyc_profiles").select("status,completion,updated_at").eq("user_id",userId).maybeSingle().then(({data})=>setKyc(data||null))},[userId]);
 if(loading)return <AppShell role="seller" title="Settings"><div className="settings-loading">Loading your workspace settings…</div></AppShell>;

 return <AppShell role="seller" title="Settings">
  <section className="settings-hero"><div><span className="hero-kicker">SELLER CONTROL CENTER</span><h2>Everything important, <span>in one place.</span></h2><p>Manage money, order automation, business identity, shipping preferences and account security without leaving Bucket India.</p></div><div className="settings-status"><i/>Account active<b>{profile?.full_name||"Seller account"}</b></div></section>
  {message&&<div className="settings-alert success">{message}</div>}{error&&<div className="settings-alert error">{error}</div>}
  <form onSubmit={saveSettings}>
   <div className="settings-grid">
    <Card icon="₹" eyebrow="BILLING" title="Billing address" description="The business address used for invoices, billing records and marketplace documents.">
      <div className="settings-form-grid"><Field label="Address line 1"><input value={form.billing_address.line1} onChange={e=>setAddress("line1",e.target.value)} placeholder="Building / street"/></Field><Field label="Address line 2"><input value={form.billing_address.line2} onChange={e=>setAddress("line2",e.target.value)} placeholder="Area / landmark"/></Field><Field label="City"><input value={form.billing_address.city} onChange={e=>setAddress("city",e.target.value)} placeholder="City"/></Field><Field label="State"><input value={form.billing_address.state} onChange={e=>setAddress("state",e.target.value)} placeholder="State"/></Field><Field label="Pincode"><input inputMode="numeric" value={form.billing_address.pincode} onChange={e=>setAddress("pincode",e.target.value)} placeholder="110001"/></Field><Field label="Country"><input value={form.billing_address.country} onChange={e=>setAddress("country",e.target.value)}/></Field></div>
    </Card>
    <Card icon="GST" eyebrow="TAX IDENTITY" title="GST details" description="Keep GST information ready for billing and business verification.">
      <div className="settings-form-grid"><Field label="GSTIN"><input value={form.gstin||""} onChange={e=>set("gstin",e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5"/></Field><Field label="GST legal name"><input value={form.gst_legal_name||""} onChange={e=>set("gst_legal_name",e.target.value)} placeholder="Legal entity name"/></Field></div>
      <div className="settings-note">GST details can be cross-checked against your KYC profile before settlement or invoice generation.</div>
    </Card>
    <Card icon="↗" eyebrow="PAYOUTS" title="COD margin bank account" description="Your COD margin and eligible seller payouts are routed to this account.">
      <div className="settings-form-grid"><Field label="Account holder name"><input value={form.bank_account_name||""} onChange={e=>set("bank_account_name",e.target.value)} placeholder="As per bank records"/></Field><Field label="Bank name"><input value={form.bank_name||""} onChange={e=>set("bank_name",e.target.value)} placeholder="Bank"/></Field><Field label="Account number"><input type="password" value={form.bank_account_number||""} onChange={e=>set("bank_account_number",e.target.value)} placeholder="Enter account number"/></Field><Field label="IFSC"><input value={form.bank_ifsc||""} onChange={e=>set("bank_ifsc",e.target.value.toUpperCase())} placeholder="HDFC0001234"/></Field></div>
      <div className={"settings-verification "+(form.bank_verified?"verified":"pending")}>{form.bank_verified?"✓ Bank details verified":"○ Bank verification pending"}<small>Verification can be connected to the payout provider before enabling withdrawals.</small></div>
    </Card>
    <Card icon="⚡" eyebrow="ORDER AUTOMATION" title="Account settings" description="Decide how new Shopify orders should move through your confirmation gate.">
      <div className="settings-toggle-list"><Toggle label="Auto-confirm orders" description="Automatically confirm eligible orders after they sync." checked={!!form.auto_confirm_orders} onChange={v=>set("auto_confirm_orders",v)}/><Toggle label="Auto-confirm prepaid" description="Allow prepaid orders to confirm automatically." checked={!!form.auto_confirm_prepaid} onChange={v=>set("auto_confirm_prepaid",v)}/><Toggle label="Auto-confirm COD" description="Allow COD orders to confirm automatically." checked={!!form.auto_confirm_cod} onChange={v=>set("auto_confirm_cod",v)}/></div>
      <Field label="Confirmation delay"><select value={form.confirmation_delay_minutes} onChange={e=>set("confirmation_delay_minutes",Number(e.target.value))}><option value={0}>Immediately</option><option value={5}>After 5 minutes</option><option value={15}>After 15 minutes</option><option value={30}>After 30 minutes</option><option value={60}>After 1 hour</option></select></Field>
      <div className="settings-danger-note">Orders with payment or address errors should always remain outside automatic confirmation until the issue is resolved.</div>
    </Card>
    <Card icon="🔒" eyebrow="SECURITY" title="Change password" description="Update the password used to sign in to Bucket India.">
      <div className="settings-form-grid"><Field label="New password"><input type="password" minLength="8" value={password.next} onChange={e=>setPassword(x=>({...x,next:e.target.value}))} placeholder="Minimum 8 characters"/></Field><Field label="Confirm password"><input type="password" minLength="8" value={password.confirm} onChange={e=>setPassword(x=>({...x,confirm:e.target.value}))} placeholder="Repeat password"/></Field></div><button type="button" className="btn secondary" onClick={changePassword}>Update password</button>{passwordMsg&&<div className="settings-inline-msg">{passwordMsg}</div>}
    </Card>
    <Card icon="✓" eyebrow="COMPLIANCE" title="KYC status" description="See your verification progress and jump directly to the KYC workspace." action={<a className="btn compact secondary" href="#/seller/kyc">Open KYC →</a>}>
      <div className="kyc-settings-status"><div><span>Status</span><b className={"kyc-pill "+(kyc?.status||"pending")}>{kycStatus[kyc?.status||"pending"]}</b></div><div><span>Completion</span><strong>{kyc?.completion||0}%</strong></div><div className="settings-progress"><i style={{width:(kyc?.completion||0)+"%"}}/></div></div>
    </Card>
    <Card icon="⌁" eyebrow="FULFILLMENT" title="Shipping preferences" description="Defaults that help keep order processing consistent.">
      <div className="settings-form-grid"><Field label="Preferred shipping partner"><input value={form.shipping_provider||""} onChange={e=>set("shipping_provider",e.target.value)} placeholder="Optional"/></Field><Field label="Default shipping mode"><select value={form.default_shipping_mode} onChange={e=>set("default_shipping_mode",e.target.value)}><option value="standard">Standard</option><option value="express">Express</option></select></Field></div>
    </Card>
    <Card icon="♢" eyebrow="NOTIFICATIONS" title="Operational alerts" description="Choose the events you want to hear about.">
      <div className="settings-toggle-list"><Toggle label="New orders" description="When Shopify orders arrive in Bucket India." checked={!!form.notify_new_orders} onChange={v=>set("notify_new_orders",v)}/><Toggle label="NDR alerts" description="When a delivery exception needs attention." checked={!!form.notify_ndr} onChange={v=>set("notify_ndr",v)}/><Toggle label="RTO alerts" description="When a shipment enters RTO risk." checked={!!form.notify_rto} onChange={v=>set("notify_rto",v)}/><Toggle label="Settlement updates" description="When money moves into or out of settlement." checked={!!form.notify_settlements} onChange={v=>set("notify_settlements",v)}/></div>
    </Card>
   </div>
   <div className="settings-savebar"><div><b>Settings are private to your seller account.</b><span>Changes are saved securely to your workspace.</span></div><button className="btn primary" disabled={saving}>{saving?"Saving…":"Save all settings"}</button></div>
  </form>
 </AppShell>
}
