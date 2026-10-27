import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {X} from 'lucide-react';
export default function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const d=ref.current;d?.showModal();return()=>{d?.close();previous?.focus()}},[]);
 return <dialog ref={ref} className={`modal ${wide?'wide':''}`} onCancel={e=>{e.preventDefault();close.current()}} onClick={e=>{if(e.target===e.currentTarget)close.current()}}><div className="modal-header"><div><span className="eyebrow">MY TRAVEL MAP</span><h2>{title}</h2></div><button className="icon-button" aria-label="대화상자 닫기" onClick={onClose}><X size={22}/></button></div>{children}</dialog>
}
