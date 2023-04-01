import env from "../utils/env.ts";
import { join } from "https://deno.land/std@0.179.0/path/mod.ts";

async function readMapFile(fileName: string) {  
  try {
    const text = await Deno.readTextFile(fileName);
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function getMap(mapName: string) {
  let data: any = null;
  // TODO
  return data;
}

export default async (
  { request, response, params }: { request: any; response: any; params: any; },
) => {
  const mapName = params.name;
  if (!mapName) {
    response.status = 400;
    response.body = { msg: "Invalid map name" };
    return;
  }

  try {
    let data: any = await getMap(mapName);
    response.body = data;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { msg: "Unable to get map" };
  }
};