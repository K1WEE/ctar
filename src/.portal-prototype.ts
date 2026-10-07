// THROWAWAY ENTRY: excluded from production main.ts.
// Isolated visual QA entry. All patient and device data below is simulated.
import 'zone.js';
import { Component, signal, computed } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { PortalPrototypeComponent } from './app/components/patient-portal/prototype/portal-prototype.component';
import { BleService } from './app/services/ble.service';
import { CtarLogicService } from './app/services/ctar-logic.service';
import { SupabaseService } from './app/services/supabase.service';
import { DataSyncService } from './app/services/data-sync.service';
import { TaskService } from './app/services/task.service';
const params = new URLSearchParams(location.search);
const empty = params.get('data') === 'empty';
const profile = {id:'preview-only', first_name:'ผู้ใช้ทดสอบ',last_name:'', stars:29};
const mockTasks = [
  {id:'t1', progress:3,completed:false,weekly_tasks:{title:'นักฝึกต่อเนื่อง',description:'ฝึกอย่างต่อเนื่องให้ครบ 5 วัน',icon:'fa-fire',target:5,reward:10}},
  {id:'t2', progress:4,completed:true,weekly_tasks:{title:'นักสู้ CTAR',description:'ฝึกให้ครบ 4 รอบในสัปดาห์นี้',icon:'fa-dumbbell',target:4,reward:15}},
  {id:'t3', progress:6,completed:false,weekly_tasks:{title:'สายอึด',description:'สะสมเวลาฝึก 10 นาทีในสัปดาห์นี้',icon:'fa-clock',target:10,reward:10}},
];
function query(table: string) {
  let single = false;
  const q: any = {
    select: () => q, eq: () => q, order: () => q, limit: () => q,
    single: () => {single = true; return q;},
    then: (resolve: any, reject: any) => Promise.resolve({
      data: table === 'patient_tasks' ? (empty ? [] : mockTasks) : single ? profile : [profile], error: null,
    }).then(resolve,reject),
  }; return q;
}
const sessionDates = [0,1,3].map(offset => {const d=new Date();d.setDate(d.getDate()-offset);return d.toISOString();});
const connectionState=signal('Disconnected');
const batteryPercent=signal(params.get('battery') === 'unknown' ? null : +(params.get('battery') ?? '80'));
const ble = {
  connectionState, batteryPercent,
  batteryLevel:computed(()=>batteryPercent()===null?'unknown':batteryPercent()===0?'empty':batteryPercent()!<=10?'critical':batteryPercent()!<=20?'low':'normal'),
  batteryNotice: signal(null), isSimulated:signal(false), dismissBatteryNotice:()=>{},
};
@Component({standalone:true,template:'<p class="p-8">หน้าปลายทางสำหรับทดสอบการนำทาง</p>'})
class DestinationStub {}
bootstrapApplication(AppComponent,{providers:[
  provideNoopAnimations(),
  provideRouter([
    {path:'patient-portal',component:PortalPrototypeComponent},
    ...['calibrate','game','summary','login','register'].map(path=>({path,component:DestinationStub})),
    {path:'**',redirectTo:'patient-portal'},
  ]),
  {provide:SupabaseService,useValue:{
    currentUser:signal(profile),isInitialized:signal(false),userRole:signal('user'),
    client:{from:query,auth:{signOut:async()=>({error:null})}},
  }},
  {provide:BleService,useValue:ble},
  {provide:CtarLogicService,useValue:{calibrationMaxForce:signal(params.get('calibrated')==='no'?0:20)}},
  {provide:TaskService,useValue:{createAdaptiveTasksIfNeeded:async()=>({status:'already_exists',taskCount:empty?0:3})}},
  {provide:DataSyncService,useValue:{
    pendingSyncCount:signal(params.get('pending')==='yes'?2:0),syncPendingSessions:async()=>{},
    fetchPatientSessions:async()=>{
      if(params.get('data')==='loading') await new Promise(()=>{});
      if(params.get('data')==='error') throw new Error('Preview data unavailable');
      return empty?[]:sessionDates.map(session_date=>({session_date,max_force:18.5,reps:10,duration_seconds:122}));
    },
  }},
]});
