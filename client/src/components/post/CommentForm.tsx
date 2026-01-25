import { useState } from "react";
import { useAddComment } from "@/features/comments/useAddComment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Clock, X, Send, Reply } from "lucide-react";

interface CommentFormProps {
  postId: number;
  parentId?: number | null;
  isOfferMode?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function CommentForm({ 
  postId, 
  parentId = null, 
  isOfferMode = false,
  onCancel,
  onSuccess 
}: CommentFormProps) {
  const [text, setText] = useState("");
  const [composing, setComposing] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDuration, setOfferDuration] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  
  const add = useAddComment(postId);

  const canSend = text.trim().length > 0 && !add.isPending && 
    (!isOfferMode || (offerPrice.length > 0));

  async function submit() {
    if (!canSend) return;
    
    await add.mutateAsync({
      content: text.trim(),
      parentId,
      isOffer: isOfferMode,
      offerPrice: isOfferMode && offerPrice ? parseInt(offerPrice) : null,
      offerDuration: isOfferMode && offerDuration ? offerDuration : null,
      offerDescription: isOfferMode && offerDescription ? offerDescription : null,
    });
    
    setText("");
    setOfferPrice("");
    setOfferDuration("");
    setOfferDescription("");
    onSuccess?.();
  }

  if (isOfferMode) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-violet-700 flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> 오퍼 제안하기
          </span>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Input
          placeholder="서비스 내용을 작성해주세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-white"
        />
        
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3" /> 가격 (USD)
            </label>
            <Input
              type="number"
              placeholder="50"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" /> 소요시간
            </label>
            <Input
              placeholder="2시간"
              value={offerDuration}
              onChange={(e) => setOfferDuration(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>
        
        <textarea
          placeholder="상세 설명 (선택)"
          value={offerDescription}
          onChange={(e) => setOfferDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none"
          rows={2}
        />
        
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              취소
            </Button>
          )}
          <Button 
            onClick={submit} 
            disabled={!canSend}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            {add.isPending ? "전송중…" : "오퍼 보내기"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="sticky bottom-0 z-[1001] bg-white border-t p-2 flex gap-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {parentId && (
        <div className="flex items-center text-xs text-violet-600 bg-violet-50 px-2 rounded-lg">
          <Reply className="w-3 h-3 mr-1" /> 답글
          {onCancel && (
            <button onClick={onCancel} className="ml-2 hover:text-violet-800">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      <input
        className="flex-1 border rounded-xl px-3 py-2"
        placeholder={parentId ? "답글을 입력하세요" : "댓글을 입력하세요"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !composing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="submit"
        disabled={!canSend}
        className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-40 flex items-center gap-1"
      >
        <Send className="w-4 h-4" />
        {add.isPending ? "…" : ""}
      </button>
    </form>
  );
}
