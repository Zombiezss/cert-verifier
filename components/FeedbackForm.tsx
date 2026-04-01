
import React, { useState } from 'react';
import { Star, Send, MessageSquare, CheckCircle, Activity } from 'lucide-react';

interface FeedbackFormProps {
  currentUser: any;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ currentUser }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:3001/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser?.username || 'Anonymous', // Capture user info
          rating,
          feedback,
          suggestions,
          comments
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to server. Feedback was not saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-[#100A38] mb-4">Thank You!</h2>
        <p className="text-gray-600 text-lg mb-8">
          Your feedback has been successfully recorded in our database. We appreciate your suggestions to improve Cert-verifier.
        </p>
        <button 
          onClick={() => {
            setIsSubmitted(false);
            setRating(0);
            setFeedback('');
            setSuggestions('');
            setComments('');
          }}
          className="px-8 py-3 bg-[#100A38] text-white rounded-full font-bold hover:bg-indigo-900 transition-all shadow-lg"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mb-8">
        <div className="bg-[#100A38] px-8 py-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 flex items-center">
              <MessageSquare className="w-8 h-8 mr-3 text-indigo-300" />
              Suggestion & Help
            </h2>
            <p className="text-indigo-100 opacity-90 max-w-xl">
              We value your input! Please rate your experience and provide suggestions on how we can improve the Cert-verifier platform.
            </p>
            {currentUser && (
               <p className="mt-2 text-xs text-indigo-300 font-mono">
                 Logged in as: {currentUser.username}
               </p>
            )}
          </div>
          <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          
          {/* Rating Section */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
            <label className="block text-lg font-bold text-gray-800 mb-4">
              How would you rate this website?
            </label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    } transition-colors duration-200`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
              {!rating && "Select a star rating"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feedback */}
            <div className="col-span-2">
              <label htmlFor="feedback" className="block text-sm font-bold text-gray-700 mb-2">
                Feedback about the website
              </label>
              <textarea
                id="feedback"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#100A38] focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="What do you like or dislike about the interface?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Suggestions */}
            <div className="col-span-2 md:col-span-1">
              <label htmlFor="suggestions" className="block text-sm font-bold text-gray-700 mb-2">
                Suggestions to improve
              </label>
              <textarea
                id="suggestions"
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#100A38] focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="What features should we add?"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              ></textarea>
            </div>

            {/* Comments */}
            <div className="col-span-2 md:col-span-1">
              <label htmlFor="comments" className="block text-sm font-bold text-gray-700 mb-2">
                Additional Comments
              </label>
              <textarea
                id="comments"
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#100A38] focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="Any other thoughts..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              ></textarea>
            </div>
          </div>
          
          {error && (
             <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
               {error}
             </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center px-8 py-4 bg-[#100A38] text-white rounded-full font-bold shadow-lg hover:bg-indigo-900 transition-all ${
                isSubmitting ? 'opacity-70 cursor-wait' : 'hover:scale-105'
              }`}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Network Status Indicator */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-gray-600 text-sm font-medium">Ethereum Mainnet</span>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;
