from .static import static_bp
from .profiles import profiles_bp
from .extensions import extensions_bp
from .courses import courses_bp
from .assignments import assignments_bp
from .students import students_bp
from .flushes import flushes_bp
from .analysis import analysis_bp


def register_routes(app):
    app.register_blueprint(static_bp)
    app.register_blueprint(profiles_bp, url_prefix="/api/profiles")
    app.register_blueprint(extensions_bp, url_prefix="/api/extensions")
    app.register_blueprint(courses_bp, url_prefix="/api/courses")
    app.register_blueprint(assignments_bp, url_prefix="/api/assignments")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(flushes_bp, url_prefix="/api/flushes")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
