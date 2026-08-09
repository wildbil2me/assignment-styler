import { NextRequest, NextResponse } from "next/server";

const types = ["hero","intro","reading","focus","homework","deadline","note","steps","checklist","vocabulary","quote","resource","targets"];

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({error:"AI drafting is not configured"},{status:503});
  const { draft, subject } = await request.json();
  const response = await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`},
    body:JSON.stringify({
      model:process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions:"Turn teacher notes into concise student-facing instructional content. Preserve facts and wording where practical. Do not invent dates, assignments, readings, or links. Choose a clear hierarchy and return 4–8 blocks. Body fields may use newlines but no Markdown.",
      input:`Subject style: ${subject}\nTeacher notes: ${draft}`,
      text:{format:{type:"json_schema",name:"composition",strict:true,schema:{type:"object",additionalProperties:false,properties:{blocks:{type:"array",minItems:4,maxItems:8,items:{type:"object",additionalProperties:false,properties:{type:{type:"string",enum:types},label:{type:"string"},title:{type:"string"},body:{type:"string"},width:{type:"string",enum:["full","half"]},emoji:{type:"string"}},required:["type","label","title","body","width","emoji"]}}},required:["blocks"]}}}
    })
  });
  if(!response.ok) return NextResponse.json({error:"AI drafting failed"},{status:response.status});
  const data=await response.json();
  const text=data.output_text || data.output?.flatMap((x:{content?:Array<{text?:string}>})=>x.content||[]).map((x:{text?:string})=>x.text||"").join("");
  return NextResponse.json(JSON.parse(text));
}
