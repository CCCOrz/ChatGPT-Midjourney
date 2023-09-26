import {Midjourney, MJMessage} from "midjourney-jk";

const {v4: uuidv4} = require('uuid');

export class MidjourneyApi {
    private client?: Midjourney
    private tasks: any = {}
    private initLock: boolean = false
    private queue: Array<any> = []
    private taskLock: boolean = false

    constructor() {
        console.log('midjourney api server constructor')
    }

    push(data: any): {} {
        const taskId = this.generateTaskId()
        data.taskId = taskId
        this.tasks[taskId] = {
            taskId,
            prompt: data.prompt,
            action: data.action,
            cmd: data.cmd,
            status: this.taskLock ? 'QUEUE' : 'SUBMITTED',
            code: 0,
            msg: `预计等待 ${this.queue.length * 2} 分钟`
        }
        this.queue.push(data)
        try {
            this.process.call(this);
            return this.tasks[taskId]
        } catch (error) {
            return {taskId, status: 'FAIL', msg: 'unknow error in MidjourneyApi client', code: 1}
        }
    }

    async process() {
        this.preStatusCheck()
        if (this.taskLock) return
        if (!this.queue.length) return
        try {
            this.taskLock = true
            const data = this.queue.shift();
            await this.submit.call(this, data);
            this.taskLock = false
            this.process();
        } catch (error) {
            throw new Error(JSON.stringify(error))
        }
    }

    isStarted() {
        return !!this.client
    }

    isInValidConfig() {
        return !!!process.env.MJ_SERVER_ID || !!!process.env.MJ_CHANNEL_ID || !!!process.env.MJ_USER_TOKEN;
    }

    generateTaskId() {
        return uuidv4()
    }

    preStatusCheck() {
        if (!this.client) {
            throw new Error('midjourney client not started')
        }
    }

    async submit(data: any): Promise<void> {
        this.preStatusCheck()
        const taskId = data.taskId ?? null
        if (!taskId) throw new Error("not found task")
        if (data.action === 'IMAGINE') {
            await this.taskCall(taskId, this.client?.Imagine(
                data.prompt,
                this.taskLoading(taskId)
            ))
        } else if (data.action === 'CUSTOM') {
            await this.taskCall(taskId, this.client?.Custom({
                msgId: data.msgId,
                flags: data.flags,
                customId: data.cmd,
                loading: this.taskLoading(taskId)
            }))
        } else {
            throw new Error("not support action")
        }
    }

    status(taskId: string): {} {
        console.log('get task status', taskId)
        this.preStatusCheck()
        if (this.tasks[taskId] && ['QUEUE'].includes(this.tasks[taskId].status)) {
            const currentIndex = this.queue.findIndex((i) => i.taskId === taskId)
            this.tasks[taskId].status = currentIndex !== -1 ? 'QUEUE' : 'SUBMITTED'
            this.tasks[taskId].msg = `预计等待 ${currentIndex * 2} 分钟`
        }
        return this.tasks[taskId] || {taskId, status: 'FAIL', msg: 'not found task', code: 1}
    }

    async start() {
        if(this.initLock){
            throw new Error('midjourney client init, please wait')
        }
        if(this.isStarted()){
            return
        }
        this.initLock = true
        console.log('midjourney api server begin start')
        const args = {
            ServerId: <string>process.env.MJ_SERVER_ID,
            ChannelId: <string>process.env.MJ_CHANNEL_ID,
            SalaiToken: <string>process.env.MJ_USER_TOKEN,
            ReplicateToken: <string>process.env.REPLICATE_TOKEN || '',
            Debug: true,
            Ws: true,
        }
        console.debug('midjourney api server args', args)
        try {
            this.client = new Midjourney(args);
            await this.client.init();
            console.log(`
     _________ .__            __     _____________________________
     \\_   ___ \\|  |__ _____ _/  |_  /  _____/\\______   \\__    ___/
     /    \\  \\/|  |  \\\\__  \\\\   __\\/   \\  ___ |     ___/ |    |   
     \\     \\___|   Y  \\/ __ \\|  |  \\    \\_\\  \\|    |     |    |   
      \\______  /___|  (____  /__|   \\______  /|____|     |____|   
             \\/     \\/     \\/              \\/                     
     _____  .__    .___    __                                         
    /     \\ |__| __| _/   |__| ____  __ _________  ____   ____ ___.__.
   /  \\ /  \\|  |/ __ |    |  |/  _ \\|  |  \\_  __ \\/    \\_/ __ <   |  |
  /    Y    \\  / /_/ |    |  (  <_> )  |  /|  | \\/   |  \\  ___/\\___  |
  \\____|__  /__\\____ |/\\__|  |\\____/|____/ |__|  |___|  /\\___  > ____|
          \\/        \\/\\______|                        \\/     \\/\\/     
        `)
            console.log('midjourney api server success started')
        } catch (e) {
            console.error(e)
            throw new Error('midjourney api server start failed')
        }finally {
            this.initLock = false
        }
    }

    taskCall(taskId: string, call: Promise<MJMessage | null> | undefined): Promise<boolean> {
        return new Promise(resolve => {
            if (!call) {
                resolve(false)
            }
            call?.then((res: any) => {
                const options = res?.options?.filter((item: any) => {
                    return ['U1', 'U2', 'U3', 'U4', 'V1', 'V2', 'V3', 'V4', '🔄', 'Vary (Strong)', 'Vary (Subtle)', 'Zoom Out 2x', 'Zoom Out 1.5x',
                        '⬅️', '➡️', '⬆️', '⬇️'].includes(item.label)
                }) || []
                this.tasks[taskId] = Object.assign(this.tasks[taskId], {
                    status: 'SUCCESS',
                    code: 0,
                    progress: res.progress,
                    uri: res.uri,
                    options: options,
                    width: res.width,
                    height: res.height,
                    msgId: res.id,
                    flags: res.flags,
                    msgHash: res.hash
                })
                resolve(true)
            }).catch((e) => {
                this.tasks[taskId] = Object.assign(this.tasks[taskId], {error: e, status: 'FAIL', code: 1})
                resolve(false)
            })
        })
    }

    taskLoading(taskId: string) {
        return (uri: string, progress: string) => {
            this.tasks[taskId] = Object.assign(this.tasks[taskId], {
                status: 'PROGRESS',
                code: 0,
                uri,
                progress
            })
        }
    }
}