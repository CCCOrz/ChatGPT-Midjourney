import {NextRequest, NextResponse} from "next/server";
import {MidjourneyApi} from "@/app/core/midjourney";
import {auth} from "@/app/api/auth";

const api = new MidjourneyApi()

async function handle(req: NextRequest, {params}: { params: { path: string[] } }) {
    const authResult = auth(req);
    if (authResult.error) {
        return NextResponse.json(authResult, {
            status: 401,
        });
    }
    if (api.isInValidConfig()) {
        return NextResponse.json({code: -1, status: 'FAIL', msg: '未配置Midjourney参数'}, {status: 200});
    }
    if (!api.isStarted()) {
        try {
            await api.start()
        } catch (e: any) {
            return NextResponse.json({code: 1, status: 'FAIL', msg: e.message}, {status: 200});
        }
    }
    const path = params.path.join("/");
    if (path == 'task/submit') {
        let data: any = null
        try {
            data = await req.json()
        } catch (e) {
            return NextResponse.json({code: 1, status: 'FAIL', msg: '无效的请求数据'}, {status: 200});
        }
        return NextResponse.json(api.submit(data), {status: 200});
    } else if (path.startsWith('task/status') && params.path.length == 3) {
        return NextResponse.json(api.status(params.path[2]), {status: 200});
    }
    return NextResponse.json({code: 1, status: 'FAIL', msg: '无效操作'}, {status: 200});
}

export const GET = handle;
export const POST = handle;