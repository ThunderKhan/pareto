"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Provider = "Gemini" | "Groq";
type Connections = { mode: "PLATFORM"|"BYOK"; providers: Array<{
  provider: Provider; connected: boolean; updatedAt: string|null;
}> };
type Usage = { days:number;attempts:number;estimatedTotalUsd:number|null;
  rows:Array<{taskId:string;provider:string;modelId:string|null;
    credentialSource:string;outcome:string;attempts:number;
    inputTokens:number|null;outputTokens:number|null;estimatedUsd:number|null}>;
  caveats:string[] };
async function request<T>(url: string, method = "GET", data?: object): Promise<T> {
  const response = await fetch(url,{method,cache:"no-store",
    ...(data?{headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}:{})});
  const payload:unknown = await response.json().catch(()=>null);
  if(!response.ok){
    const message=payload && typeof payload==="object" && "error" in payload &&
      typeof payload.error==="string" ? payload.error : "Request could not be completed.";
    throw new Error(message);
  }
  return payload as T;
}
const base="/api/v1/account/ai";
export default function AiProviderSettings(){
  const [connections,setConnections]=useState<Connections|null>(null);
  const [usage,setUsage]=useState<Usage|null>(null);
  const [provider,setProvider]=useState<Provider>("Gemini");
  const [key,setKey]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(false);
  const reload=useCallback(async()=>{
    const [items,stats]=await Promise.all([
      request<Connections>(base+"/providers"),
      request<Usage>(base+"/usage?days=7"),
    ]);
    setConnections(items);setUsage(stats);
  },[]);
  useEffect(()=>{
    let mounted=true;
    void Promise.all([
      request<Connections>(base+"/providers"),
      request<Usage>(base+"/usage?days=7"),
    ]).then(([items,stats])=>{if(mounted){setConnections(items);setUsage(stats);}})
      .catch(e=>{if(mounted)setError(e instanceof Error?e.message:"AI settings are unavailable.");});
    return ()=>{mounted=false;};
  },[]);
  async function act(fn:()=>Promise<unknown>,success:string){
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{await fn();await reload();setMessage(success);}
    catch(e){setError(e instanceof Error?e.message:"Unable to update AI connections.");}
    finally{setKey("");setBusy(false);}
  }
  const current=connections?.providers.find(item=>item.provider===provider);
  function save(e:FormEvent){e.preventDefault();if(key.length<12)return;
    void act(()=>request(base+"/providers","PUT",{provider,key}),"Credential saved after provider verification.");}
  return <div className="pareto-profile-card">
    <section className="pareto-profile-section" aria-labelledby="ai-connection-title">
      <h2 id="ai-connection-title">AI provider connections</h2>
      <p>Use Pareto&apos;s platform provider, or connect your own Gemini or Groq account.
        API keys are encrypted on the server and are never shown again after saving.
        Your provider may charge your account for usage.</p>
      {!connections && !error && <p role="status">Loading AI connections…</p>}
      {connections && <div className="pareto-profile-form">
        <p><strong>Current mode:</strong> {connections.mode==="BYOK"?"My API keys":"Pareto platform keys"}</p>
        <div className="pareto-profile-two">
          <button type="button" disabled={busy||connections.mode==="PLATFORM"}
            onClick={()=>void act(()=>request(base+"/providers","PATCH",{mode:"PLATFORM"}),"Using Pareto platform keys.")}>
            Use platform keys</button>
          <button type="button" disabled={busy||connections.mode==="BYOK"}
            onClick={()=>void act(()=>request(base+"/providers","PATCH",{mode:"BYOK"}),"Using your connected API keys.")}>
            Use my keys</button>
        </div>
        <small>Personal and platform keys are never mixed. A missing personal key stops AI calls instead of silently charging the platform.</small>
      </div>}
      <form className="pareto-profile-form" onSubmit={save} autoComplete="off">
        <label>AI provider
          <select value={provider} disabled={busy} onChange={e=>{setProvider(e.target.value as Provider);setKey("");setConfirmDelete(false);}}>
            <option value="Gemini">Google Gemini</option><option value="Groq">GroqCloud</option>
          </select>
        </label>
        <p>{provider} credential: <strong>{current?.connected?"Connected":"Not connected"}</strong></p>
        <label>New API key (replaces an existing key)
          <input type="password" name="provider-key" autoComplete="off" spellCheck={false}
            value={key} onChange={e=>setKey(e.target.value)} maxLength={256}
            placeholder={"Paste your "+provider+" API key"} disabled={busy}/>
        </label>
        <small>The key is sent only to Pareto&apos;s authenticated server. Save verifies it using the provider&apos;s models endpoint without sending resume content.</small>
        <button type="submit" disabled={busy||key.length<12}>{busy?"Processing…":"Verify and save key"}</button>
      </form>
      {current?.connected && <div className="pareto-profile-form">
        <div className="pareto-profile-two">
          <button type="button" disabled={busy} onClick={()=>void act(()=>request(base+"/providers","POST",{provider}),"Provider credential is valid.")}>
            Test connected key</button>
          <button type="button" disabled={busy} onClick={()=>{
            if(!confirmDelete){setConfirmDelete(true);return;}
            setConfirmDelete(false);
            void act(()=>request(base+"/providers","DELETE",{provider}),"Provider key deleted.");
          }}>{confirmDelete?"Confirm removal":"Remove key"}</button>
        </div>
        {confirmDelete && <small>Removing this key cannot undo an already running provider request.</small>}
      </div>}
      {error && <p role="alert" className="pareto-profile-message pareto-profile-message--error">{error}</p>}
      {message && <p role="status" className="pareto-profile-message">{message}</p>}
    </section>
    <section className="pareto-profile-section" aria-labelledby="ai-usage-title">
      <h2 id="ai-usage-title">AI usage · last 7 days</h2>
      {usage ? <>
        <p>{usage.attempts.toLocaleString()} recorded calls.
          {" "}Estimated cost: {usage.estimatedTotalUsd===null?"Unavailable (unknown pricing or token counts)":
            "$"+usage.estimatedTotalUsd.toFixed(6)+" USD"}</p>
        {usage.rows.length>0 ? <div style={{overflowX:"auto"}}>
          <table><thead><tr><th scope="col">Task</th><th scope="col">Provider</th>
            <th scope="col">Source</th><th scope="col">Outcome</th><th scope="col">Calls</th>
            <th scope="col">Input tokens</th><th scope="col">Output tokens</th></tr></thead>
            <tbody>{usage.rows.map((row,i)=><tr key={i}>
              <td>{row.taskId}</td><td>{row.provider}</td><td>{row.credentialSource}</td>
              <td>{row.outcome}</td><td>{row.attempts}</td><td>{row.inputTokens??"Unknown"}</td>
              <td>{row.outputTokens??"Unknown"}</td></tr>)}</tbody></table></div> :
          <p>No model-call usage has been recorded.</p>}
        <small>Usage metadata is not a verified provider invoice. Missing token counts and unconfigured prices are not treated as zero.</small>
      </> : <p role="status">Loading usage…</p>}
    </section>
  </div>;
}
