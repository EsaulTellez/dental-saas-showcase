import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Info, ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const AgendarCitaView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [procedures, setProcedures] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [weeklyApts, setWeeklyApts] = useState([]);
  const [clinicSettings, setClinicSettings] = useState({ open_hour: 9, close_hour: 18, break_start: '', break_end: '' });
  const [unavailableBlocks, setUnavailableBlocks] = useState([]);
  
  const [isAgendando, setIsAgendando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showEvaluationPrompt, setShowEvaluationPrompt] = useState(false);
  const [pendingProc, setPendingProc] = useState(null);

  // Nuevo estado para el sistema de alertas premium
  const [modal, setModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'confirm'
    onConfirm: null
  });

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setModal({ show: true, title, message, type, onConfirm });
  };

  useEffect(() => {
    fetchInitialData();
    validateToken();
  }, [token]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, calendarMonth)) {
      setCalendarMonth(selectedDate);
    }
    if (tokenData || token === 'test-valido') {
      fetchWeeklyAppointments();
    }
    
    const channel = supabase.channel(`public:appointments:booking-${selectedDate.getTime()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
         if (tokenData || token === 'test-valido') fetchWeeklyAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, tokenData]);

  const fetchInitialData = async () => {
    const [pRes, cRes, bRes, sRes] = await Promise.all([
       supabase.from('procedures').select('*').eq('activo', true).order('nombre'),
       supabase.from('clinic_settings').select('*').single(),
       supabase.from('unavailable_blocks').select('*'),
       supabase.from('staff').select('*').eq('active', true).order('nombre')
    ]);
    if (pRes.data) setProcedures(pRes.data);
    if (cRes.data) setClinicSettings(cRes.data);
    if (bRes.data) setUnavailableBlocks(bRes.data);
    if (sRes.data) setStaff(sRes.data);
  };

  const validateToken = async () => {
    setIsLoading(true);

    if (token === 'test-valido') {
      setTokenData({ id: 'test-1', phone: '5255000000', procedimiento_id: null, usado: false, is_new: true, expira_at: new Date(Date.now() + 86400000).toISOString() });
      setIsLoading(false);
      return;
    }
    if (token === 'test-frecuente') {
      setTokenData({ id: 'frec-1', phone: '5255111111', procedimiento_id: null, usado: false, is_new: false, expira_at: new Date(Date.now() + 86400000).toISOString() });
      setIsLoading(false);
      return;
    }

    const { data: tData, error: tErr } = await supabase
      .from('patient_tokens')
      .select('*, patients(id, name)')
      .eq('token', token)
      .single();

    if (tErr || !tData) { setErrorStatus('not_found'); setIsLoading(false); return; }
    if (tData.usado) { setErrorStatus('used'); setIsLoading(false); return; }
    if (new Date(tData.expira_at) < new Date()) { setErrorStatus('expired'); setIsLoading(false); return; }
    
    setTokenData(tData);
    setIsLoading(false);
  };

  useEffect(() => {
    if (tokenData?.procedimiento_id && procedures.length > 0 && !selectedProcedure) {
      const proc = procedures.find(p => p.id === tokenData.procedimiento_id);
      if (proc) setSelectedProcedure(proc);
    }
  }, [procedures, tokenData]);

  const fetchWeeklyAppointments = async () => {
    const dStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const dEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const { data: apts } = await supabase.from('appointments').select('*').gte('date', dStart).lte('date', dEnd);
    setWeeklyApts(apts || []);
  };

  const handleChangeProcedure = (e) => {
    const proc = procedures.find(p => p.id === e.target.value);
    
    if (proc?.requiere_valoracion) {
        setPendingProc(proc);
        setShowEvaluationPrompt(true);
        setShowWarning(false);
    } else if (proc) {
       setSelectedProcedure(proc);
       setShowWarning(false);
    } else {
       setSelectedProcedure(null);
       setShowWarning(false);
    }
  };

  const handleAcceptEvaluation = () => {
      const valProc = procedures.find(p => p.nombre.toLowerCase().includes('valoraci')) || procedures.find(p => !p.requiere_valoracion) || pendingProc;
      setSelectedProcedure(valProc);
      setShowEvaluationPrompt(false);
      setPendingProc(null);
      setShowWarning(false);
  };

  const handleCancelEvaluation = () => {
      setSelectedProcedure(null);
      setShowEvaluationPrompt(false);
      setPendingProc(null);
      setShowWarning(true);
  };

  const getDayScheduleForStaff = (dateObj, st) => {
    let workingDays = st.working_days || clinicSettings.working_days;
    try {
      const configMap = typeof workingDays === 'string' ? JSON.parse(workingDays) : workingDays;
      return configMap[dateObj.getDay().toString()];
    } catch(e) {
      return { active: true, open: clinicSettings.open_hour, close: clinicSettings.close_hour };
    }
  };

  const getDaySlots = (dateObj) => {
    const dStr = format(dateObj, 'yyyy-MM-dd');
    
    const fullDayBlock = unavailableBlocks.find(b => {
       if (b.staff_id) return false;
       const bStart = new Date(b.start_at);
       const bEnd = new Date(b.end_at);
       return bStart <= new Date(`${dStr}T00:00:00`) && bEnd >= new Date(`${dStr}T23:59:59`);
    });
    
    if (fullDayBlock) return { slots: [], isBlocked: true, blockReason: fullDayBlock.title };

    const authIds = selectedProcedure?.allowed_staff_ids || [];
    const authStaff = authIds.length > 0 ? staff.filter(s => authIds.includes(s.id)) : staff;
    
    const startHour = clinicSettings.open_hour;
    const endHour = clinicSettings.close_hour;

    const slots = [];
    const dayApts = weeklyApts.filter(a => a.date === dStr);
    const neededDuration = selectedProcedure ? selectedProcedure.duracion_minutos : 30;

    let breakStartMins = -1;
    let breakEndMins = -1;
    if (clinicSettings.break_start && clinicSettings.break_end) {
       const [bSH, bSM] = clinicSettings.break_start.split(':').map(Number);
       const [bEH, bEM] = clinicSettings.break_end.split(':').map(Number);
       breakStartMins = bSH * 60 + bSM;
       breakEndMins = bEH * 60 + bEM;
    }

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + (selectedProcedure?.duracion_minutos || 30);
        
        let isPast = false;
        const today = new Date();
        today.setHours(0,0,0,0);
        const processingDate = new Date(dateObj);
        processingDate.setHours(0,0,0,0);

        if (processingDate < today) {
          isPast = true;
        } else if (processingDate.getTime() === today.getTime()) {
           const now = new Date();
           if (slotStart <= now.getHours() * 60 + now.getMinutes() + 120) {
              isPast = true;
           }
        }

        if (isPast) continue;

        const isClinicBreak = breakStartMins > -1 && (slotStart < breakEndMins && slotEnd > breakStartMins);
        if (isClinicBreak) continue;

        const availableSpecialist = authStaff.find(st => {
          const stSched = getDayScheduleForStaff(dateObj, st);
          if (!stSched || !stSched.active) return false;
          
          if (h < stSched.open || h >= stSched.close) return false;
          if (slotEnd > stSched.close * 60) return false;

          const stOccupied = dayApts.some(a => {
            if (a.staff_id !== st.id) return false;
            const proc = procedures.find(p => p.id === a.procedure_id);
            const dur = proc ? proc.duracion_minutos : 30;
            const sH = parseInt(a.time.split(':')[0]);
            const sM = parseInt(a.time.split(':')[1]);
            const start = sH * 60 + sM;
            const end = start + dur;
            return slotStart < end && slotEnd > start;
          });

          const onVacation = unavailableBlocks.find(b => {
            if (b.staff_id !== st.id) return false;
            const bStart = new Date(b.start_at);
            const bEnd = new Date(b.end_at);
            const slotStartDate = new Date(`${dStr}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
            const slotEndDate = new Date(slotStartDate.getTime() + neededDuration * 60000);
            return slotStartDate < bEnd && slotEndDate > bStart;
          });
          
          if (onVacation) return false;
          
          if (st.break_start && st.break_end) {
             const [bsh, bsm] = st.break_start.split(':').map(Number);
             const [beh, bem] = st.break_end.split(':').map(Number);
             if (slotStart < (beh * 60 + bem) && slotEnd > (bsh * 60 + bsm)) return false;
          }
          return !stOccupied;
        });

        if (availableSpecialist) {
           slots.push({
             time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
             isAvailable: true
           });
        }
      }
    }

    const isCompletelyClosed = authStaff.every(st => {
      const s = getDayScheduleForStaff(dateObj, st);
      return !s || !s.active;
    });

    return { 
      slots, 
      isBlocked: isCompletelyClosed, 
      blockReason: isCompletelyClosed ? "Sin especialistas disponibles" : "" 
    };
  };

  const handleSelectSlot = async (timeStr, dateObj) => {
     if (!selectedProcedure) return showAlert("Casi listo", "Por favor, selecciona un procedimiento antes de agendar.", "info");
     if (showWarning) return;

     showAlert(
        "Confirmar Cita", 
        `¿Confirmar cita el ${format(dateObj, 'dd/MM/yyyy')} a las ${timeStr} para: ${selectedProcedure.nombre}?`,
        "confirm",
        async () => {
           await processBooking(timeStr, dateObj);
        }
     );
  };

  const processBooking = async (timeStr, dateObj) => {
     setIsAgendando(true);
     
     // --- CANDADO DE SEGURIDAD 1: Re-validar Token en tiempo real ---
     const { data: latestToken, error: tokenCheckErr } = await supabase
        .from('patient_tokens')
        .select('usado, expira_at')
        .eq('token', token)
        .single();

     if (tokenCheckErr || !latestToken || latestToken.usado || new Date(latestToken.expira_at) < new Date()) {
        showAlert("Enlace no válido", "Este enlace ya no es válido o ya fue utilizado.", "error", () => {
           window.location.reload();
        });
        setIsAgendando(false);
        return;
     }

     // Si es reagendamiento (tenemos token y paciente conocido), agendamos DIRECTO
     if (tokenData?.patient_id && tokenData?.procedimiento_id) {
        // --- CANDADO DE SEGURIDAD 2: Re-validar disponibilidad del horario ---
        const dStr = format(dateObj, 'yyyy-MM-dd');
        const { data: existingApt } = await supabase
           .from('appointments')
           .select('id')
           .eq('date', dStr)
           .eq('time', timeStr)
           .maybeSingle();

        if (existingApt) {
           showAlert("Horario Ocupado", "Lo sentimos, este horario acaba de ser ocupado. Por favor elige otro.", "warning");
           fetchWeeklyAppointments(); // Refrescar horarios
           setIsAgendando(false);
           return;
        }

        // Buscamos el primer especialista disponible para este slot exacto
        const authIds = selectedProcedure?.allowed_staff_ids || [];
        const authStaff = authIds.length > 0 ? staff.filter(s => authIds.includes(s.id)) : staff;
        
        const [h, m] = timeStr.split(':').map(Number);
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + selectedProcedure.duracion_minutos;
        const dayApts = weeklyApts.filter(a => a.date === dStr);

        const targetStaff = authStaff.find(st => {
           const stSched = getDayScheduleForStaff(dateObj, st);
           if (!stSched || !stSched.active) return false;
           if (h < stSched.open || h >= stSched.close) return false;
           const stOccupied = dayApts.some(a => {
              if (a.staff_id !== st.id) return false;
              const p = procedures.find(proc => proc.id === a.procedure_id);
              const dur = p ? p.duracion_minutos : 30;
              const [sH, sM] = a.time.split(':').map(Number);
              const start = sH * 60 + sM;
              const end = start + dur;
              return slotStart < end && slotEnd > start;
           });
           return !stOccupied;
        });

        const { error: aptErr } = await supabase.from('appointments').insert([{
           patient_id: tokenData.patient_id,
           procedure_id: selectedProcedure.id,
           staff_id: targetStaff?.id || authStaff[0].id,
           date: dStr,
           time: timeStr,
           treatment: selectedProcedure.nombre,
           status: 'confirmed'
        }]);

        if (!aptErr) {
           await supabase.from('patient_tokens').update({ usado: true }).eq('id', tokenData.id);
           
           // Notificar a n8n para confirmación por WhatsApp
           try {
             await fetch('https://loessal-overbravely-sherry.ngrok-free.dev/webhook/confirmacion-agendado', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 phone: tokenData.phone,
                 nombre: tokenData.patients?.name || 'Paciente',
                 fecha: dStr,
                 hora: timeStr,
                 tratamiento: selectedProcedure.nombre,
                 tipo: 'confirmacion_reagendado'
               })
             });
           } catch (n8nErr) {
             console.warn("No se pudo enviar notificación de WhatsApp, pero la cita se guardó.", n8nErr);
           }

           setSuccess(true);
        } else {
           showAlert("Error", "Ocurrió un error. Por favor intenta de nuevo.", "error");
        }
     } else {
        // Flujo normal de SOLICITUD para pacientes nuevos o links generales
        const { error: reqErr } = await supabase.from('appointment_requests').insert([{
           phone: tokenData.phone,
           procedimiento_id: selectedProcedure.id,
           horario_solicitado: new Date(`${format(dateObj, 'yyyy-MM-dd')}T${timeStr}:00`).toISOString(),
           status: 'pendiente'
        }]);

        if (!reqErr) {
           if (token !== 'test-valido' && token !== 'test-frecuente') {
               await supabase.from('patient_tokens').update({ usado: true }).eq('id', tokenData.id);
           }
           if (tokenData.is_new) {
               navigate(`/cuestionario/${token}`);
           } else {
               // Notificar a n8n para confirmación por WhatsApp (Solicitud)
               try {
                 await fetch('https://n8n.tudominio.com/webhook/confirmacion-agendado', {
                   method: 'POST',
                   headers: { 
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true'
                },
                   body: JSON.stringify({
                     phone: tokenData.phone,
                     nombre: tokenData.patients?.name || 'Paciente',
                     fecha: format(dateObj, 'yyyy-MM-dd'),
                     hora: timeStr,
                     tratamiento: selectedProcedure.nombre,
                     tipo: 'solicitud_pendiente'
                   })
                 });
               } catch (n8nErr) {
                 console.warn("No se pudo enviar notificación de WhatsApp.");
               }
               setSuccess(true);
           }
        } else {
           showAlert("Error", "Ocurrió un error al enviar la solicitud. Por favor intenta de nuevo.", "error");
        }
     }
     setIsAgendando(false);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center p-6 bg-slate-50 font-sans"><p className="font-extrabold text-slate-400">Preparando agenda...</p></div>;

  if (errorStatus) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center font-sans">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Enlace no válido</h2>
        <p className="text-slate-500 font-bold max-w-sm">
          {errorStatus === 'used' ? 'Este enlace ya fue utilizado.' :
           errorStatus === 'expired' ? 'Este enlace ha caducado por seguridad.' :
           'No pudimos procesar tu solicitud. Por favor contacta al consultorio.'}
        </p>
      </div>
    );
  }

  if (success) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#ebfbf3] text-center font-sans">
         <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-[#128C7E]">
            <CheckCircle size={48} />
         </div>
         <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">¡Solicitud Enviada!</h2>
         <p className="text-slate-500 font-bold max-w-sm mt-2 leading-relaxed">Revisaremos tu horario y te confirmaremos vía WhatsApp en breve. ¡Te esperamos!</p>
       </div>
    );
  }

  const calStart = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
  const monthlyDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const viewDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col items-center mb-10 text-center animate-in fade-in duration-700">
        <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-2">
          {tokenData?.patients?.name ? `¡Hola, ${tokenData.patients.name.split(' ')[0]}!` : 'Reserva tu cita'}
        </h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Portal de Autogestión Dental</p>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
        
        <div className="w-full lg:w-[350px] flex flex-col gap-8 shrink-0">
           <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8">
              <h2 className="text-xl font-extrabold text-blue-900 mb-6 flex items-center uppercase tracking-widest text-xs">
                 <CalendarIcon size={16} className="mr-2" /> Paso 1: Tratamiento
              </h2>
              
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">¿Qué servicio necesitas?</label>
              <select 
                 value={selectedProcedure?.id || ''} 
                 onChange={handleChangeProcedure}
                 disabled={!!tokenData?.procedimiento_id}
                 className={`w-full border-2 border-slate-50 rounded-2xl px-5 py-4 font-black transition-all appearance-none ${tokenData?.procedimiento_id ? 'bg-blue-50 text-blue-800 cursor-not-allowed border-blue-100' : 'bg-slate-50 text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 cursor-pointer'}`}
              >
                 <option value="" disabled>Selecciona un servicio...</option>
                 {procedures.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>

              {tokenData?.procedimiento_id && (
                <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-blue-600 mt-1 shrink-0" />
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                    Este tratamiento es el correspondiente a tu cita y ha sido pre-seleccionado por el consultorio.
                  </p>
                </div>
              )}

              {showWarning && (
                 <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} className="text-red-500 mr-3 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800 font-bold leading-relaxed">
                       Este procedimiento requiere una valoración previa. Por favor selecciona "Valoración Inicial" para continuar con tu agendamiento.
                    </p>
                 </div>
              )}
           </div>

           <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 hidden lg:block">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-blue-900 text-base capitalize tracking-tight">{format(calendarMonth, "MMMM yyyy", { locale: es })}</h3>
                 <div className="flex gap-2">
                    <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"><ChevronRight size={18} /></button>
                 </div>
              </div>
              <div className="grid grid-cols-7 gap-y-3 text-center text-[9px] font-black text-slate-300 mb-4 tracking-[0.2em] uppercase">
                 <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
              </div>
              <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center text-sm font-bold text-slate-700">
                 {monthlyDays.map((day, idx) => {
                    const isCurrentM = isSameMonth(day, calendarMonth);
                    const isSelectedW = day >= weekStart && day <= weekEnd;
                    const isToday = isSameDay(day, new Date());
                    
                    let cls = "py-2.5 rounded-xl cursor-not-allowed transition-all flex items-center justify-center text-xs font-black ";
                    if (isSelectedW) {
                       cls = "py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center text-xs font-black bg-blue-50 text-blue-600 ring-1 ring-blue-100";
                    } else if (isToday) {
                       cls += "text-blue-600 bg-white ring-1 ring-blue-100";
                    } else if (!isCurrentM) {
                       cls += "text-slate-200 opacity-20";
                    } else {
                       cls = "py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center text-xs font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600";
                    }

                    return (
                       <div key={idx} onClick={() => setSelectedDate(day)} className={cls}>
                          {format(day, 'd')}
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>

        <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-w-0">
           <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-extrabold text-blue-900 hidden lg:flex items-center uppercase tracking-widest text-xs">
                 <Clock size={16} className="mr-2" /> Paso 2: Elige Horario
              </h2>
              <div className="flex justify-between w-full lg:w-auto items-center">
                 <button onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className="lg:hidden p-3 bg-white rounded-2xl shadow-sm border border-slate-100"><ChevronLeft size={16}/></button>
                 <span className="lg:hidden font-extrabold text-blue-900 capitalize tracking-tight">{format(selectedDate, "MMM yyyy", { locale: es })}</span>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"><ChevronLeft size={16} className="text-slate-600"/></button>
                    <span className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] hidden sm:inline px-2">Semana de {format(weekStart, 'd')} al {format(weekEnd, 'd')}</span>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"><ChevronRight size={16} className="text-slate-600"/></button>
                 </div>
              </div>
           </div>
           <div className="flex-1 p-4 lg:p-8">
               {!selectedProcedure ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                     <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mb-6 text-blue-200">
                        <CalendarIcon size={32} />
                     </div>
                     <p className="font-extrabold text-slate-800 text-xl tracking-tight">Casi listos...</p>
                     <p className="text-slate-400 font-bold text-sm mt-2 max-w-xs">Selecciona el tratamiento a la izquierda para ver los horarios disponibles.</p>
                  </div>
               ) : (
                  <>
                    {/* Nueva barra de días para móvil */}
                    <div className="lg:hidden flex overflow-x-auto gap-3 pb-6 mb-6 hide-scrollbar border-b border-slate-50">
                      {viewDays.map(day => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <button 
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={`flex flex-col items-center min-w-[60px] py-3 rounded-2xl transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-tighter mb-1">
                              {format(day, 'EEE', {locale: es})}
                            </span>
                            <span className="text-lg font-black">{format(day, 'd')}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-4 w-full flex-col lg:flex-row">
                      {viewDays.map(day => {
                        const isSelectedMobile = isSameDay(day, selectedDate);
                        const { slots, isBlocked, blockReason } = getDaySlots(day);
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={`flex-1 min-w-0 ${!isSelectedMobile ? 'hidden lg:block' : 'block'}`}
                          >
                             <div className={`hidden lg:block text-center mb-6 pb-4 border-b ${isToday ? 'border-blue-600' : 'border-slate-100'}`}>
                                <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isToday ? 'text-blue-600' : 'text-slate-300'}`}>{format(day, 'EEE', {locale: es})}</p>
                                <p className={`text-2xl font-black mt-1 ${isToday ? 'text-blue-900' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                             </div>
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                                {isBlocked ? (
                                   <div className="col-span-full text-center py-8 px-2 bg-slate-50/40 rounded-2xl border border-dotted border-slate-100">
                                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">{blockReason || "N/A"}</p>
                                   </div>
                                ) : slots.length === 0 ? (
                                   <div className="col-span-full text-center py-8 px-2 bg-slate-50/40 rounded-2xl border border-dotted border-slate-100">
                                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Sin cupos</p>
                                   </div>
                                ) : (
                                   slots.map((s, i) => (
                                      <button 
                                         key={i} 
                                         disabled={isAgendando}
                                         onClick={() => handleSelectSlot(s.time, day)}
                                         className="w-full py-3.5 rounded-xl border border-slate-50 bg-white text-xs font-black text-blue-600 hover:bg-blue-600 hover:border-blue-600 hover:text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center uppercase tracking-tighter"
                                      >
                                         {s.time}
                                      </button>
                                   ))
                                )}
                             </div>
                          </div>
                        );
                       })}
                    </div>
                  </>
               )}
            </div>
         </div>
      </div>

      {showEvaluationPrompt && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-[32px] flex items-center justify-center mb-6 text-amber-500">
                   <Info size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Valoración Previa</h3>
                <p className="text-slate-500 font-bold text-sm mt-4 leading-relaxed px-4">
                  Parece que necesitas <strong>{pendingProc?.nombre}</strong>. Por seguridad y precisión, requerimos una valoración inicial antes de agendar este tratamiento.
                </p>
             </div>
             <div className="p-10 pt-0 flex flex-col gap-3">
                <button 
                  onClick={handleAcceptEvaluation}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                  Agendar Valoración
                </button>
                <button 
                  onClick={handleCancelEvaluation}
                  className="w-full bg-white hover:bg-slate-50 text-slate-400 font-bold py-5 rounded-2xl transition-all border-2 border-slate-50 uppercase tracking-widest text-xs"
                >
                  Elegir otro servicio
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE SISTEMA PREMIUM */}
      {modal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                modal.type === 'error' ? 'bg-red-50 text-red-500' :
                modal.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                modal.type === 'confirm' ? 'bg-blue-50 text-blue-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {modal.type === 'error' ? <AlertCircle size={32} /> :
                 modal.type === 'confirm' ? <CalendarIcon size={32} /> :
                 <Info size={32} />}
              </div>
              
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{modal.title}</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">{modal.message}</p>
            </div>
            
            <div className="p-8 pt-0 flex gap-3">
              {modal.type === 'confirm' && (
                <button 
                  onClick={() => setModal({ ...modal, show: false })}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  setModal({ ...modal, show: false });
                  if (modal.onConfirm) modal.onConfirm();
                }}
                className={`flex-1 font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px] ${
                  modal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200' :
                  'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }`}
              >
                {modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AgendarCitaView;
