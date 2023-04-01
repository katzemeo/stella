const MAX_MAP_FILE_SIZE = 500 * 1024;
const ERR_UPLOAD_FILE_SIZE = "Unable to upload.  Please check the file size.";
const ERR_UPLOAD_FILE_CONTENTS = "Unable to parse map file.  Please check file contents.";
const ERR_UPLOAD_UNEXPECTED = "Unable to upload due to unexpected error.";
const ERR_UPLOAD_JSON_EXPECTED = "Invalid file type, JSON file expected.";

async function parseMapFile(uploadFilename: string, text: string) {
  try {
    const result = JSON.parse(text);
    console.debug(`Validating uploaded JSON file ${uploadFilename}...`);
    return result;
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to parse for JSON file!`);
  }
}

export default async (
  { request, response, params }: { request: any; response: any; params: any },
) => {
  var data: any;
  try {
    const body = await request.body({ type: "form-data" });
    data = await body.value.read({
      maxFilesize: MAX_MAP_FILE_SIZE,
      maxSize: MAX_MAP_FILE_SIZE * 2,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof TypeError) {
      response.status = 413;
      response.body = { msg: ERR_UPLOAD_FILE_SIZE };
    } else {
      response.status = 400;
      response.body = { msg: ERR_UPLOAD_UNEXPECTED };
    }
    return;
  }

  if (
    data.files &&
    (data.files[0].contentType == "application/json")
  ) {
    let uploadFilename = data.files[0].originalName;
    console.debug(`Uploading file "${uploadFilename}"`);
    let json;
    if (data.files[0].content) {
      try {
        json = await parseMapFile(uploadFilename, new TextDecoder().decode(data.files[0].content));
        response.body = json;
      } catch (e) {
        console.error(e);
        response.status = 422;
        response.body = { msg: ERR_UPLOAD_FILE_CONTENTS };
      }
    } else {
      try {
        const stat = await Deno.stat(data.files[0].filename);
        if (stat.size <= MAX_MAP_FILE_SIZE) {
          json = await parseMapFile(uploadFilename, await Deno.readTextFile(data.files[0].filename));
          response.body = json;
        } else {
          response.status = 413;
          response.body = { msg: ERR_UPLOAD_FILE_SIZE };
        }
      } catch (e) {
        console.error(e);
        response.status = 422;
        response.body = { msg: ERR_UPLOAD_FILE_CONTENTS };
      } finally {
        Deno.remove(data.files[0].filename);
      }
    }
  } else {
    response.status = 415;
    response.body = { msg: ERR_UPLOAD_JSON_EXPECTED };
  }
};
