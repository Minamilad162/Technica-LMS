import {courses as importedCourses} from '../data/courseCatalog.js';

export const demoMediaExamples = [
  {id:'example-pdf-asp',courseId:'asp',title:'Introduction to Process Safety',fileName:'Process-Safety-Introduction.pdf',kind:'pdf',sample:true},
  {id:'example-video-asp',courseId:'asp',title:'Process Safety Orientation',fileName:'Process-Safety-Orientation.mp4',kind:'video',sample:true},
  {id:'example-pdf-psee',courseId:'psee',title:'PSEE syllabus outline',fileName:'PSEE-Syllabus.pdf',kind:'pdf',sample:true},
];

const baseInfo = {
  asp: {category:'Safety Certification',status:'published',publishAt:null},
  psee: {category:'Engineering Education',status:'draft',publishAt:null},
};

export function courseStatus(course, now=Date.now()) {
  if (course.status==='published') return 'published';
  if (course.status==='scheduled' && course.publishAt && new Date(course.publishAt).getTime()<=now) return 'published';
  return course.status==='scheduled' ? 'scheduled' : 'draft';
}

export function allAdminCourses(state) {
  const builtIn=importedCourses.map(c=>({
    ...c, ...baseInfo[c.id], ...state.courseEdits?.[c.id], builtIn:true,
  }));
  return [...builtIn,...(state.createdCourses||[]).map(c=>({...c,builtIn:false,domainIds:[]}))];
}

export function adminCourse(state,id) {return allAdminCourses(state).find(c=>c.id===id)||null;}

export function courseMediaFor(state,courseId) {
  return [...demoMediaExamples,...(state.courseMedia||[])].filter(m=>m.courseId===courseId);
}

export function validateCourse(form,existing=[],editingId=null){
  const name=String(form.name||'').trim();
  if(name.length<3)return 'Course name must contain at least 3 characters.';
  if(existing.some(x=>x.id!==editingId&&x.name.toLowerCase()===name.toLowerCase()))return 'A course with this name already exists.';
  if(form.status==='scheduled'){
    const dt=new Date(form.publishAt||'');
    if(!Number.isFinite(dt.getTime())||dt.getTime()<=Date.now())return 'Select a future publication date and time.';
  }
  return '';
}

export function createCourseId(name,items){
  const base=String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'course';
  let id=base,n=2;
  while(items.some(x=>x.id===id))id=`${base}-${n++}`;
  return id;
}
