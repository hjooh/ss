












/* Leave this for later

import { NextResponse } from "next/server";
import { SearchParameters } from "@/types";

const BASE_URL = process.env.SCRAPER_BASE;

function setParams(sp: URLSearchParams, params: SearchParameters) {
  // required
  sp.set("keyword", params.keyword);
  sp.set("type", params.type);

  // optional
  if (params.sort) {
    sp.set("sort", params.sort);
  }
}

function 


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get();
}
*/